/**
 * Synthetic demo data standing in for a database. No real people or
 * organizations. Replace with your persistence layer.
 */
export interface User {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
}

export interface GroupEvent {
  groupId: string;
  title: string;
  kind: "match" | "practice" | "meeting";
  start: string; // ISO
  /** IANA zone the event happens in; times are shown in this zone. */
  timeZone: string;
  venue: string;
  opponent?: string;
  result?: string;
}

export const users: User[] = [
  { id: "u-demo", name: "Demo Organizer" },
  { id: "u-other", name: "Other Organizer" },
];

export const groups: Group[] = [
  { id: "g-riverside", name: "Riverside Runners", memberIds: ["u-demo"] },
  { id: "g-harbor", name: "Harbor Rowing Club", memberIds: ["u-other"] },
];

const day = (offset: number, hour = 17) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const events: GroupEvent[] = [
  { groupId: "g-riverside", title: "League match", kind: "match", start: day(-3), timeZone: "America/New_York", venue: "North Field", opponent: "Hillcrest", result: "Win 3-1" },
  { groupId: "g-riverside", title: "Practice", kind: "practice", start: day(2), timeZone: "America/New_York", venue: "Riverside Park" },
  { groupId: "g-riverside", title: "League match", kind: "match", start: day(5, 10), timeZone: "America/New_York", venue: "Lakeview Stadium", opponent: "Eastside" },
  { groupId: "g-harbor", title: "Regatta", kind: "match", start: day(4, 9), timeZone: "America/Chicago", venue: "Harbor Basin", opponent: "Bayside" },
];
