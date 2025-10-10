import OpenAI from "openai";

export async function embedTextList(
  texts: string[],
  model = "text-embedding-3-small"
): Promise<number[][]> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing for embeddings");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const inputs = texts.map((t) => t || "");
  const res = await client.embeddings.create({ model, input: inputs });
  return res.data.map((d) => d.embedding as unknown as number[]);
}

export async function embedQuery(
  text: string,
  model = "text-embedding-3-small"
): Promise<number[]> {
  const [vec] = await embedTextList([text], model);
  return vec;
}
