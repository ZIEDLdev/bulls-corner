use candid::{CandidType, Principal};
use ic_cdk::api::time;
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_cdk_timers::TimerId;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::BTreeMap;

// ---------- Types ----------

pub type MessageId = u64;
pub type RoomId = u64;

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct Message {
    pub id: MessageId,
    pub room_id: RoomId,
    pub author: Principal,
    pub content: String,
    pub timestamp: u64,
    pub reply_to: Option<MessageId>,
    pub edited: bool,
    pub tip_total_e8s: u64,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct Profile {
    pub owner: Principal,
    pub nickname: Option<String>,
    pub bio: Option<String>,
    pub join_date: u64,
    pub tips_given_e8s: u64,
    pub tips_received_e8s: u64,
    pub messages_posted: u64,
    pub referral_code: Option<String>,
    pub referral_count: u64,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct Room {
    pub id: RoomId,
    pub name: String,
    pub description: String,
    pub creator: Principal,
    pub is_private: bool,
    pub created_at: u64,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct LeaderboardEntry {
    pub principal: Principal,
    pub score_e8s: u64,
    pub nickname: Option<String>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct LeaderboardCache {
    pub last_updated: u64,
    pub all_time: Vec<LeaderboardEntry>,
    pub monthly: Vec<LeaderboardEntry>,
}

impl Default for LeaderboardCache {
    fn default() -> Self {
        Self {
            last_updated: 0,
            all_time: Vec::new(),
            monthly: Vec::new(),
        }
    }
}

// ---------- State ----------

#[derive(Clone, CandidType, Serialize, Deserialize)]
struct State {
    next_message_id: MessageId,
    next_room_id: RoomId,
    messages: BTreeMap<MessageId, Message>,
    rooms: BTreeMap<RoomId, Room>,
    profiles: BTreeMap<Principal, Profile>,
    leaderboard_cache: LeaderboardCache,
}

impl Default for State {
    fn default() -> Self {
        Self {
            next_message_id: 1,
            next_room_id: 1,
            messages: BTreeMap::new(),
            rooms: BTreeMap::new(),
            profiles: BTreeMap::new(),
            leaderboard_cache: LeaderboardCache::default(),
        }
    }
}

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
    static LEADERBOARD_TIMER: RefCell<Option<TimerId>> = RefCell::new(None);
}

// ---------- Helpers ----------

fn caller() -> Principal {
    ic_cdk::caller()
}

fn ensure_profile_exists(p: Principal) {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        if !s.profiles.contains_key(&p) {
            let profile = Profile {
                owner: p,
                nickname: None,
                bio: None,
                join_date: time(),
                tips_given_e8s: 0,
                tips_received_e8s: 0,
                messages_posted: 0,
                referral_code: None,
                referral_count: 0,
            };
            s.profiles.insert(p, profile);
        }
    });
}

fn recompute_leaderboard() {
    STATE.with(|s| {
        let mut st = s.borrow_mut();

        // Very simple all-time leaderboard: sort by tips_received_e8s
        let mut entries: Vec<LeaderboardEntry> = st
            .profiles
            .iter()
            .map(|(principal, profile)| LeaderboardEntry {
                principal: *principal,
                score_e8s: profile.tips_received_e8s,
                nickname: profile.nickname.clone(),
            })
            .collect();

        entries.sort_by(|a, b| b.score_e8s.cmp(&a.score_e8s));
        if entries.len() > 50 {
            entries.truncate(50);
        }

        st.leaderboard_cache.all_time = entries.clone();

        // Monthly: for now just reuse all-time (can be extended with month-specific stats)
        st.leaderboard_cache.monthly = entries;
        st.leaderboard_cache.last_updated = time();
    });
}

fn schedule_leaderboard_timer() {
    // 5 minutes in nanoseconds
    let interval_ns: u64 = 5 * 60 * 1_000_000_000;

    LEADERBOARD_TIMER.with(|tcell| {
        let mut opt = tcell.borrow_mut();
        if opt.is_some() {
            return;
        }
        let id = ic_cdk_timers::set_timer_interval(std::time::Duration::from_nanos(interval_ns), || {
            recompute_leaderboard();
        });
        *opt = Some(id);
    });
}

// ---------- Lifecycle ----------

#[init]
fn init() {
    // Initialize default state & leaderboard timer
    STATE.with(|_s| {
        // access once to ensure initialization
    });
    schedule_leaderboard_timer();
}

#[pre_upgrade]
fn pre_upgrade() {
    STATE.with(|s| {
        let state = s.borrow();
        // Clone the underlying State so we can move it into stable memory
        let cloned: State = state.clone();
        ic_cdk::storage::stable_save((cloned,)).expect("failed to stable_save state");
    });
}

#[post_upgrade]
fn post_upgrade() {
    let (state,): (State,) = ic_cdk::storage::stable_restore().unwrap_or((State::default(),));
    STATE.with(|s| {
        *s.borrow_mut() = state;
    });
    schedule_leaderboard_timer();
}

// ---------- Queries ----------

#[query]
fn whoami() -> Principal {
    caller()
}

#[query]
fn get_time_nanos() -> u64 {
    time()
}

#[query]
fn get_profile(principal: Principal) -> Option<Profile> {
    STATE.with(|s| s.borrow().profiles.get(&principal).cloned())
}

#[query]
fn get_my_profile() -> Option<Profile> {
    let me = caller();
    STATE.with(|s| s.borrow().profiles.get(&me).cloned())
}

#[query]
fn list_rooms() -> Vec<Room> {
    STATE.with(|s| s.borrow().rooms.values().cloned().collect())
}

#[query]
fn list_messages(
    room_id: RoomId,
    from_timestamp_inclusive: Option<u64>,
    limit: u32,
) -> Vec<Message> {
    let from_ts = from_timestamp_inclusive.unwrap_or(0);
    let max = if limit == 0 { 50 } else { limit.min(200) } as usize;

    STATE.with(|s| {
        let st = s.borrow();
        let mut msgs: Vec<Message> = st
            .messages
            .values()
            .filter(|m| m.room_id == room_id && m.timestamp >= from_ts)
            .cloned()
            .collect();
        msgs.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
        if msgs.len() > max {
            msgs.truncate(max);
        }
        msgs
    })
}

#[query]
fn get_leaderboard(period: String) -> Vec<LeaderboardEntry> {
    STATE.with(|s| {
        let st = s.borrow();
        match period.as_str() {
            "monthly" => st.leaderboard_cache.monthly.clone(),
            _ => st.leaderboard_cache.all_time.clone(),
        }
    })
}

// ---------- Updates ----------

#[update]
fn upsert_profile(
    nickname: Option<String>,
    bio: Option<String>,
) -> Profile {
    let me = caller();
    STATE.with(|s| {
        let mut st = s.borrow_mut();
        let entry = st.profiles.entry(me).or_insert(Profile {
            owner: me,
            nickname: None,
            bio: None,
            join_date: time(),
            tips_given_e8s: 0,
            tips_received_e8s: 0,
            messages_posted: 0,
            referral_code: None,
            referral_count: 0,
        });

        if nickname.is_some() {
            entry.nickname = nickname;
        }
        if bio.is_some() {
            entry.bio = bio;
        }

        entry.clone()
    })
}

#[update]
fn create_room(name: String, description: String, is_private: bool) -> Room {
    let me = caller();
    ensure_profile_exists(me);

    STATE.with(|s| {
        let mut st = s.borrow_mut();
        let id = st.next_room_id;
        st.next_room_id += 1;

        let room = Room {
            id,
            name,
            description,
            creator: me,
            is_private,
            created_at: time(),
        };

        st.rooms.insert(id, room.clone());
        room
    })
}

#[update]
fn send_message(
    room_id: RoomId,
    content: String,
    reply_to: Option<MessageId>,
) -> Message {
    let me = caller();
    ensure_profile_exists(me);

    if content.trim().is_empty() {
        ic_cdk::trap("message content cannot be empty");
    }

    STATE.with(|s| {
        let mut st = s.borrow_mut();

        if !st.rooms.contains_key(&room_id) {
            ic_cdk::trap("room not found");
        }

        let id = st.next_message_id;
        st.next_message_id += 1;

        let msg = Message {
            id,
            room_id,
            author: me,
            content,
            timestamp: time(),
            reply_to,
            edited: false,
            tip_total_e8s: 0,
        };

        st.messages.insert(id, msg.clone());

        // Stats
        if let Some(profile) = st.profiles.get_mut(&me) {
            profile.messages_posted += 1;
        }

        msg
    })
}

#[update]
fn edit_message(message_id: MessageId, new_content: String) {
    let me = caller();
    if new_content.trim().is_empty() {
        ic_cdk::trap("new content cannot be empty");
    }

    STATE.with(|s| {
        let mut st = s.borrow_mut();
        let msg = st
            .messages
            .get_mut(&message_id)
            .unwrap_or_else(|| ic_cdk::trap("message not found"));

        if msg.author != me {
            ic_cdk::trap("only the author can edit this message");
        }

        msg.content = format!("{} (edited)", new_content);
        msg.edited = true;
    });
}

// For now, this only updates on-chain counters. Actual ICRC-1 transfers
// will be wired via a separate canister in a later step.
#[update]
fn tip_message(message_id: MessageId, amount_e8s: u64) {
    let tipper = caller();
    if amount_e8s == 0 {
        ic_cdk::trap("tip amount must be > 0");
    }

    STATE.with(|s| {
        let mut st = s.borrow_mut();

        // 1) Update the message and capture the author principal
        let author = {
            let msg = st
                .messages
                .get_mut(&message_id)
                .unwrap_or_else(|| ic_cdk::trap("message not found"));

            msg.tip_total_e8s = msg.tip_total_e8s.saturating_add(amount_e8s);
            msg.author
        }; // `msg` borrow ends here

        // 2) Now safely borrow profiles mutably
        if let Some(tipper_profile) = st.profiles.get_mut(&tipper) {
            tipper_profile.tips_given_e8s =
                tipper_profile.tips_given_e8s.saturating_add(amount_e8s);
        }

        if let Some(author_profile) = st.profiles.get_mut(&author) {
            author_profile.tips_received_e8s =
                author_profile.tips_received_e8s.saturating_add(amount_e8s);
        }
    });

    // We can either recompute immediately or rely on the 5-min timer.
    // Here we nudge the cache for snappy UX.
    recompute_leaderboard();
}

#[update]
fn register_referral(referral_code: String) {
    let me = caller();
    let code = referral_code.trim();
    if code.is_empty() {
        ic_cdk::trap("referral code cannot be empty");
    }

    STATE.with(|s| {
        let mut st = s.borrow_mut();

        // Ensure my profile exists
        ensure_profile_exists(me);

        // If someone referred me, increment their count if they exist
        let referrer = st.profiles.iter_mut().find_map(|(_p, prof)| {
            if let Some(rc) = &prof.referral_code {
                if rc == code {
                    return Some(prof);
                }
            }
            None
        });

        if let Some(prof) = referrer {
            prof.referral_count = prof.referral_count.saturating_add(1);
        }
    });
}
