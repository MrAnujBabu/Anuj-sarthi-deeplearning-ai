const KEY_TERMS = /(?<!\*)\b(NOT|EXCEPT|INCORRECT|incorrect|not correct|false|FALSE|correct|CORRECT|true|TRUE|least|most|maximum|minimum|always|never|only)\b(?!\*)/g;

/** Bold the words that flip a NEET question's meaning (NOT, EXCEPT, incorrect…) outside code and math. */
export function emphasizeQuizQuestion(text: string): string {
  return text
    .split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$|\$[^$\n]*\$|<!--[\s\S]*?-->)/g)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(KEY_TERMS, "**$1**")))
    .join("");
}
