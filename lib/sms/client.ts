const TWILIO_API = "https://api.twilio.com/2010-04-01";

export class TwilioSmsError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TwilioSmsError";
    this.status = status;
  }
}

function basicAuth(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

async function readTwilioError(res: Response) {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as { message?: string; code?: number };
    if (data.message) {
      return data.code ? `${data.message} (${data.code})` : data.message;
    }
  } catch {
    // Réponse non JSON : on garde le statut HTTP.
  }
  return `Twilio a répondu ${res.status}`;
}

export async function verifyTwilioSmsAccount(input: {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}) {
  const auth = basicAuth(input.accountSid, input.authToken);
  const accountUrl = `${TWILIO_API}/Accounts/${encodeURIComponent(input.accountSid)}.json`;
  const accountRes = await fetch(accountUrl, {
    headers: { Authorization: auth },
  });
  if (!accountRes.ok) {
    throw new TwilioSmsError(
      await readTwilioError(accountRes),
      accountRes.status,
    );
  }

  const numbersUrl = new URL(
    `${TWILIO_API}/Accounts/${encodeURIComponent(input.accountSid)}/IncomingPhoneNumbers.json`,
  );
  numbersUrl.searchParams.set("PhoneNumber", input.fromNumber);
  const numbersRes = await fetch(numbersUrl, {
    headers: { Authorization: auth },
  });
  if (!numbersRes.ok) {
    throw new TwilioSmsError(
      await readTwilioError(numbersRes),
      numbersRes.status,
    );
  }
  const numbers = (await numbersRes.json()) as {
    incoming_phone_numbers?: unknown[];
  };
  if (!numbers.incoming_phone_numbers?.length) {
    throw new TwilioSmsError(
      `Le numéro ${input.fromNumber} n'est pas sur ce compte Twilio.`,
      404,
    );
  }
}

export async function sendTwilioSms(input: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}) {
  const params = new URLSearchParams({
    From: input.from,
    To: input.to,
    Body: input.body,
  });
  const res = await fetch(
    `${TWILIO_API}/Accounts/${encodeURIComponent(input.accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: basicAuth(input.accountSid, input.authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );
  if (!res.ok) {
    throw new TwilioSmsError(await readTwilioError(res), res.status);
  }
  const data = (await res.json()) as { sid?: string };
  if (!data.sid) {
    throw new TwilioSmsError("Twilio n'a pas renvoyé d'identifiant de message.", 502);
  }
  return { sid: data.sid };
}
