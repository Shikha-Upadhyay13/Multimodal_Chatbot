const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

type Extractor = (
  text: string,
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ data: Float32Array | number[] }>;

let extractorPromise: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    // Dynamic import: @huggingface/transformers is ESM-only and can't be `require()`-d
    // from this CommonJS backend, but a dynamic import() works fine from either module system.
    extractorPromise = import("@huggingface/transformers").then(({ pipeline }) =>
      pipeline("feature-extraction", MODEL_ID),
    ) as Promise<Extractor>;
  }
  return extractorPromise;
}

/** Call once at server startup so the ~90MB model download/load doesn't stall the first request. */
export async function warmUpEmbedder(): Promise<void> {
  await getExtractor();
}

export async function embedText(text: string): Promise<Float32Array> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return new Float32Array(output.data);
}
