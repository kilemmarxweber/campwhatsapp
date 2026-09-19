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
  error?: string | null;
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

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.apiKey}`);
    // Ne pas forcer Content-Type sur FormData (boundary multipart).
    if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(this.url(path), {
      ...init,
      headers,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Klambo ${res.status}: ${text || res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  async getMessage(id: string) {
    return this.request<KlamboSendResponse>(`/v1/messages/${id}`);
  }

  async send(payload: KlamboSendPayload) {
    const result = await this.request<KlamboSendResponse>("/v1/send", {
      method: "POST",
      body: JSON.stringify({
        channel: "whatsapp",
        ...payload,
      }),
    });

    // L'API Klambo répond HTTP 200 même si GOWA a échoué (status: failed).
    if (result.status === "failed") {
      let detail = result.error ?? null;
      try {
        const full = await this.getMessage(result.id);
        detail = full.error ?? detail;
      } catch {
        // ignore
      }
      throw new Error(
        detail
          ? `Klambo failed: ${detail}`
          : `Klambo failed (message ${result.id})`,
      );
    }

    return result;
  }

  async uploadMedia(bytes: Buffer | Uint8Array, filename: string, mimeType: string) {
    const form = new FormData();
    const file = new File([bytes as BlobPart], filename, { type: mimeType });
    form.append("file", file, filename);
    form.append("filename", filename);

    return this.request<KlamboMediaUploadResponse>("/v1/media", {
      method: "POST",
      body: form,
    });
  }

  /** Fichier déjà sous le UPLOAD_DIR partagé de l'API. */
  registerMedia(input: {
    relative_path: string;
    mime_type: string;
    filename?: string;
  }) {
    return this.request<KlamboMediaUploadResponse>("/v1/media/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  registerWebhook(url: string, events: string[]) {
    return this.request<{ id: string; secret: string }>("/v1/webhooks", {
      method: "POST",
      body: JSON.stringify({ url, events }),
    });
  }
}
