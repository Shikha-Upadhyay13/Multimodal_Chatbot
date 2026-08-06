import officeParser from "officeparser";

export async function parsePptx(buffer: Buffer): Promise<string> {
  const ast = await officeParser.parseOffice(buffer, { fileType: "pptx" });
  const { value } = await ast.to("text");
  return value;
}
