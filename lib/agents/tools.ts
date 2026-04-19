import type Anthropic from "@anthropic-ai/sdk";

export const NEGOTIATION_TOOLS: Anthropic.Tool[] = [
  {
    name: "propose_deal",
    description:
      "Propose a rental deal with a price per day and handoff plan. Use this for your opening offer.",
    input_schema: {
      type: "object" as const,
      properties: {
        price_usd_per_day: {
          type: "number",
          description: "Proposed rental price in USD per day",
        },
        duration_days: {
          type: "number",
          description: "How many days the rental would last",
        },
        handoff_method: {
          type: "string",
          enum: ["in_person", "shipping"],
          description: "How the garment will be exchanged",
        },
        handoff_location: {
          type: "string",
          description:
            "Where/when to meet for in-person handoff, or shipping details",
        },
        reasoning: {
          type: "string",
          description: "Brief explanation of why this is a fair deal",
        },
      },
      required: [
        "price_usd_per_day",
        "duration_days",
        "handoff_method",
        "handoff_location",
        "reasoning",
      ],
    },
  },
  {
    name: "counter_offer",
    description:
      "Counter the other party's proposal with adjusted terms. Never repeat the same offer.",
    input_schema: {
      type: "object" as const,
      properties: {
        price_usd_per_day: {
          type: "number",
          description: "Counter-proposed price in USD per day",
        },
        duration_days: {
          type: "number",
          description: "Counter-proposed duration in days",
        },
        handoff_method: {
          type: "string",
          enum: ["in_person", "shipping"],
          description: "Preferred handoff method",
        },
        handoff_location: {
          type: "string",
          description: "Preferred handoff location/details",
        },
        reasoning: {
          type: "string",
          description: "Why you are countering with these terms",
        },
      },
      required: [
        "price_usd_per_day",
        "duration_days",
        "handoff_method",
        "handoff_location",
        "reasoning",
      ],
    },
  },
  {
    name: "accept_deal",
    description:
      "Accept the current proposed deal. Only call this when you are satisfied with the terms.",
    input_schema: {
      type: "object" as const,
      properties: {
        final_message: {
          type: "string",
          description: "A brief closing message confirming the deal",
        },
      },
      required: ["final_message"],
    },
  },
  {
    name: "reject_deal",
    description:
      "Reject the negotiation entirely. Use sparingly — only when terms are unacceptable.",
    input_schema: {
      type: "object" as const,
      properties: {
        reasoning: {
          type: "string",
          description: "Why the deal cannot work",
        },
      },
      required: ["reasoning"],
    },
  },
];

export type ProposeDealInput = {
  price_usd_per_day: number;
  duration_days: number;
  handoff_method: "in_person" | "shipping";
  handoff_location: string;
  reasoning: string;
};

export type CounterOfferInput = {
  price_usd_per_day: number;
  duration_days: number;
  handoff_method: "in_person" | "shipping";
  handoff_location: string;
  reasoning: string;
};

export type AcceptDealInput = {
  final_message: string;
};

export type RejectDealInput = {
  reasoning: string;
};

export type ToolInput =
  | { name: "propose_deal"; input: ProposeDealInput }
  | { name: "counter_offer"; input: CounterOfferInput }
  | { name: "accept_deal"; input: AcceptDealInput }
  | { name: "reject_deal"; input: RejectDealInput };
