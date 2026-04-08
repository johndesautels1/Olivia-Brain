import { NextResponse } from "next/server";

import {
  buildInboundVoiceTwiml,
  parseTwilioInboundVoicePayload,
  validateTwilioWebhookRequest,
} from "@/lib/twilio/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formDataToRecord(value: URLSearchParams) {
  return Object.fromEntries(value.entries());
}

function buildXmlResponse(xml: string, validationMode: string) {
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "X-Olivia-Twilio-Validation": validationMode,
    },
  });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const payload = formDataToRecord(requestUrl.searchParams);
  const validation = validateTwilioWebhookRequest({
    request,
    body: "",
    params: {},
    method: "GET",
  });

  if (!validation.ok) {
    return NextResponse.json(
      {
        error: validation.reason,
      },
      { status: 401 },
    );
  }

  const xml = buildInboundVoiceTwiml(parseTwilioInboundVoicePayload(payload));

  return buildXmlResponse(xml, validation.mode);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const payload = formDataToRecord(new URLSearchParams(rawBody));
  const validation = validateTwilioWebhookRequest({
    request,
    body: rawBody,
    params: payload,
    method: "POST",
  });

  if (!validation.ok) {
    return NextResponse.json(
      {
        error: validation.reason,
      },
      { status: 401 },
    );
  }

  const xml = buildInboundVoiceTwiml(parseTwilioInboundVoicePayload(payload));

  return buildXmlResponse(xml, validation.mode);
}
