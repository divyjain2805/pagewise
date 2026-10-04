import Groq from "groq-sdk";

let groq;

const getGroq = () => {
    if (groq) {
        return groq;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured");
    }

    groq = new Groq({ apiKey });
    return groq;
};

export const generateAnswer = async (
    context,
    question
) => {

    const prompt = `
You are a PDF assistant.

Answer ONLY from the provided context.

If the answer is not present in the context, reply:

"I could not find that information in the uploaded PDF."

Context:
${context}

Question:
${question}
`;

    const response =
        await getGroq().chat.completions.create({
            model: "openai/gpt-oss-20b",

            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

    const answer = response.choices[0]?.message?.content;
    if (!answer) {
        throw new Error("Groq returned an empty answer");
    }

    return answer;
};