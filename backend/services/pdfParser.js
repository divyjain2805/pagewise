import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

export const extractTextFromPdf = async (filePath) => {

    const buffer = await readFile(filePath);
    if (buffer.length < 5 || buffer.subarray(0, 5).toString() !== "%PDF-") {
        throw new Error("Uploaded file is not a valid PDF.");
    }

    const parser = new PDFParse({
        data: buffer
    });

    const result = await parser.getText();

    return result.text;
};