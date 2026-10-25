// The three attack categories we support
export type Category = "phishing" | "social-engineering" | "scam";

// The weaknesses we will track for each user
export type Weakness =
  | "urgency"
  | "authority"
  | "suspicious-links"
  | "fake-offers";

// How safe or unsafe an answer was
export type Result = "safe" | "risky" | "dangerous";

// One answer button the user can choose
export type Option = {
  id: string;
  text: string;
  result: Result;
  riskScore: number; // 0 = perfectly safe, 100 = very dangerous
  feedback: string; // short explanation shown after choosing
};

// One full training scenario
export type Scenario = {
  id: number;
  category: Category;
  attackType: string;
  difficulty: 1 | 2 | 3;
  weakness: Weakness;
  sender: string;
  context: string;
  message: string;
  options: Option[];
  redFlags: string[];
};

export const scenarios: Scenario[] = [
  {
    id: 1,
    category: "phishing",
    attackType: "Fake university IT alert",
    difficulty: 1,
    weakness: "urgency",
    sender: "IT Security <it-security@univ-support-help.com>",
    context: "You are a student checking your email between classes.",
    message:
      "🚨 SECURITY ALERT: Your university account will be disabled in 10 minutes. Verify your account immediately to avoid losing access.",
    options: [
      {
        id: "a",
        text: "Click the Verify Account link",
        result: "dangerous",
        riskScore: 95,
        feedback:
          "The link could steal your password. Real IT teams do not threaten to disable accounts in minutes.",
      },
      {
        id: "b",
        text: "Report the message as phishing",
        result: "safe",
        riskScore: 5,
        feedback:
          "Correct. Reporting protects you and other students from the same attack.",
      },
      {
        id: "c",
        text: "Reply and ask if the message is real",
        result: "risky",
        riskScore: 55,
        feedback:
          "Replying confirms your email is active and gives the attacker a chance to keep pressuring you.",
      },
    ],
    redFlags: [
      "Extreme time pressure (10 minutes)",
      "Threat of losing your account",
      "Sender domain does not match the university's real domain",
      "Generic message with no personal details",
    ],
  },
  {
    id: 2,
    category: "social-engineering",
    attackType: "Fake manager gift card request",
    difficulty: 1,
    weakness: "authority",
    sender: "Dr. Rao (Department Head) <dr.rao.office@gmail.com>",
    context: "You work as a student assistant in a university department.",
    message:
      "I'm stuck in a meeting and can't talk. I need you to buy 5 gift cards for a client right now and send me the codes. I will reimburse you today. Please keep this between us.",
    options: [
      {
        id: "a",
        text: "Buy the gift cards and send the codes",
        result: "dangerous",
        riskScore: 90,
        feedback:
          "Gift card codes are as good as cash, and they cannot be recovered once sent.",
      },
      {
        id: "b",
        text: "Contact Dr. Rao using the number you already have",
        result: "safe",
        riskScore: 10,
        feedback:
          "Correct. Always confirm unusual requests through a channel you already trust.",
      },
      {
        id: "c",
        text: "Ignore it and tell nobody",
        result: "risky",
        riskScore: 35,
        feedback:
          "Ignoring it protects you, but the attacker may target someone else. Report it.",
      },
    ],
    redFlags: [
      "Authority figure asking for something unusual",
      "Personal email address instead of an official one",
      "Request for gift card codes",
      "Asked to keep it secret",
    ],
  },
  {
    id: 3,
    category: "scam",
    attackType: "Fake delivery fee",
    difficulty: 2,
    weakness: "suspicious-links",
    sender: "+1 (555) 013-4477 (text message)",
    context: "You are waiting for an online order to arrive this week.",
    message:
      "Your parcel could not be delivered. Pay a $1.99 redelivery fee within 24 hours or it will be returned: pkg-redeliver-fee.com/track",
    options: [
      {
        id: "a",
        text: "Pay the small fee through the link",
        result: "dangerous",
        riskScore: 85,
        feedback:
          "The small fee is bait. The real goal is to steal your card details.",
      },
      {
        id: "b",
        text: "Check the order in the shop's official app or website",
        result: "safe",
        riskScore: 10,
        feedback:
          "Correct. Go to the real source yourself instead of using links in messages.",
      },
      {
        id: "c",
        text: "Forward the text to friends to warn them",
        result: "risky",
        riskScore: 40,
        feedback:
          "Good intention, but a friend might tap the link. Report it instead of forwarding it.",
      },
    ],
    redFlags: [
      "Unexpected message from an unknown number",
      "Small fee to hide a bigger theft",
      "Unfamiliar website address",
      "24-hour deadline",
    ],
  },
];