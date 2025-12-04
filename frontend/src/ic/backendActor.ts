import { Actor, HttpAgent, AnonymousIdentity } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { IDL } from "@dfinity/candid";
import { BACKEND_CANISTER_ID, HOST, isLocal } from "./config";

const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
  const MessageId = IDL.Nat64;
  const RoomId = IDL.Nat64;

  const Message = IDL.Record({
    id: MessageId,
    room_id: RoomId,
    author: IDL.Principal,
    content: IDL.Text,
    timestamp: IDL.Nat64,
    reply_to: IDL.Opt(MessageId),
    edited: IDL.Bool,
    tip_total_e8s: IDL.Nat64,
  });

  const Profile = IDL.Record({
    owner: IDL.Principal,
    nickname: IDL.Opt(IDL.Text),
    bio: IDL.Opt(IDL.Text),
    join_date: IDL.Nat64,
    tips_given_e8s: IDL.Nat64,
    tips_received_e8s: IDL.Nat64,
    messages_posted: IDL.Nat64,
    referral_code: IDL.Opt(IDL.Text),
    referral_count: IDL.Nat64,
  });

  const Room = IDL.Record({
    id: RoomId,
    name: IDL.Text,
    description: IDL.Text,
    creator: IDL.Principal,
    is_private: IDL.Bool,
    created_at: IDL.Nat64,
  });

  const LeaderboardEntry = IDL.Record({
    user: IDL.Principal,
    score_e8s: IDL.Nat64,
    nickname: IDL.Opt(IDL.Text),
  });

  return IDL.Service({
    whoami: IDL.Func([], [IDL.Principal], ["query"]),
    get_time_nanos: IDL.Func([], [IDL.Nat64], ["query"]),

    get_profile: IDL.Func([IDL.Principal], [IDL.Opt(Profile)], ["query"]),
    get_my_profile: IDL.Func([], [IDL.Opt(Profile)], ["query"]),
    upsert_profile: IDL.Func(
      [IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
      [Profile],
      []
    ),

    create_room: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Bool],
      [Room],
      []
    ),
    list_rooms: IDL.Func([], [IDL.Vec(Room)], ["query"]),

    send_message: IDL.Func(
      [RoomId, IDL.Text, IDL.Opt(MessageId)],
      [Message],
      []
    ),
    edit_message: IDL.Func(
      [MessageId, IDL.Text],
      [],
      []
    ),
    list_messages: IDL.Func(
      [RoomId, IDL.Opt(IDL.Nat64), IDL.Nat32],
      [IDL.Vec(Message)],
      ["query"]
    ),

    tip_message: IDL.Func(
      [MessageId, IDL.Nat64],
      [],
      []
    ),
    get_leaderboard: IDL.Func(
      [IDL.Text],
      [IDL.Vec(LeaderboardEntry)],
      ["query"]
    ),

    register_referral: IDL.Func(
      [IDL.Text],
      [],
      []
    ),
  });
};

let authClientPromise: Promise<AuthClient> | null = null;

export const getAuthClient = async (): Promise<AuthClient> => {
  if (!authClientPromise) {
    authClientPromise = AuthClient.create();
  }
  return authClientPromise;
};

export const loginWithII = async (): Promise<void> => {
  const authClient = await getAuthClient();

  return new Promise((resolve, reject) => {
    authClient.login({
      identityProvider: "https://identity.ic0.app",
      onSuccess: () => resolve(),
      onError: reject,
    });
  });
};

export const logoutII = async (): Promise<void> => {
  const authClient = await getAuthClient();
  await authClient.logout();
};

export const getBackendActor = async () => {
  let identity;

  if (isLocal) {
    // IMPORTANT: Local replica cannot validate mainnet II delegation.
    // Use anonymous identity for local development.
    identity = new AnonymousIdentity();
  } else {
    const authClient = await getAuthClient();
    identity = authClient.getIdentity();
  }

  const agent = new HttpAgent({
    host: HOST,
    identity,
  });

  if (isLocal) {
    try {
      await agent.fetchRootKey();
    } catch (err) {
      console.error("fetchRootKey failed. Is the local replica running?", err);
      throw err;
    }
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  });
};
