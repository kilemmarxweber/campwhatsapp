export type KlamboSendType = "text" | "image" | "video" | "document" | "audio";

export type KlamboSendPayload = {
  to: string;
  channel?: "whatsapp" | "sms";
  type?: KlamboSendType;
  text?: string;
  caption?: string;
  filename?: string;
  media?: { id?: string; link?: string };
  idempotency_key?: string;
};

export type KlamboSendResponse = {
  id: string;
  status: string;
  channel: string;
  to: string;
  provider_message_id?: string;
  created_at?: string;
};

export type KlamboMediaUploadResponse = {
  id: string;
  mime_type: string;
  size: number;
  filename: string;
  url?: string;
  expires_at?: string;
};

export class KlamboClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  private url(path: string) {
    return `${this.baseUrl.replace(/\/$/, "")}${path}`;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const res = await fetch(this.url(path), {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(init.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Klambo ${res.status}: ${text || res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  send(payload: KlamboSendPayload) {
    return this.request<KlamboSendResponse>("/v1/send", {
      method: "POST",
      body: JSON.stringify({
        channel: "whatsapp",
        ...payload,
      }),
    });
  }

  async uploadMedia(file: Blob, filename: string) {
    const form = new FormData();
    form.append("file", file, filename);
    return this.request<KlamboMediaUploadResponse>("/v1/media", {
      method: "POST",
      body: form,
    });
  }

  registerWebhook(url: string, events: string[]) {
    return this.request<{ id: string; secret: string }>("/v1/webhooks", {
      method: "POST",
      body: JSON.stringify({ url, events }),
    });
  }
}
