export async function sendWhatsAppMessage(
  to: string,
  message: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.capso.com/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to, message }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    const data = await response.json();
    return { success: true, ...data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
