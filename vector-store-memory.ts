import {
  BaseMessagePromptTemplateLike,
  ChatPromptTemplate,
} from "@langchain/core/prompts";
import { InputValues } from "@langchain/core/utils/types";
import { Document } from "@langchain/core/documents";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import csvParser from "csv-parser";
import * as fs from "fs";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

async function main() {
  // ✅ Embedding 모델 생성
  const embeddings = new OpenAIEmbeddings();
  const vectorStore = new MemoryVectorStore(embeddings);

  // ✅ LLM (GPT) 모델 설정
  const llm = new ChatOpenAI({
    // temperature: 0.7, // 창의적이지만 컨텍스트 기반
    // modelName: "gpt-4", // GPT-4 사용 가능
    model: "gpt-4o-mini",
    temperature: 0,
  });

  /**
   * CSV 파일을 읽고 데이터를 배열로 변환하는 함수
   */
  async function readCSV(
    userId: string,
    filePath: string
  ): Promise<Document[]> {
    return new Promise((resolve, reject) => {
      const results: Document[] = [];
      fs.createReadStream(`./docs/${filePath}`)
        .pipe(csvParser())
        .on("data", (data) => {
          const doc = new Document({
            pageContent: data.text, // CSV의 text 필드 저장
            metadata: {
              userId, // 사용자 ID 저장
              timestamp: data.timestamp, // 타임스탬프 저장
            },
          });
          results.push(doc);
        })
        .on("end", () => resolve(results))
        .on("error", (error) => reject(error));
    });
  }

  /**
   * 사용자별 데이터를 Embedding 후 MemoryVectorStore에 저장
   */
  // async function storeUserData(userId: string, filePath: string) {
  //   const documents = await readCSV(userId, filePath);

  //   await vectorStore.addDocuments(documents);
  //   console.log(`✅ ${userId}의 데이터 MemoryVectorStore에 저장 완료`);
  // }

  async function storeUserData() {
    // const documents = await readCSV(userId, filePath);
    let documents: Document[] = [];
    [
      { name: "짱구", age: 7 },
      { name: "흰둥이", age: 5 },
      { name: "짱아", age: 3 },
    ].map((data) => {
      const doc = new Document({
        pageContent: JSON.stringify(data), // CSV의 text 필드 저장
        metadata: {
          ...data,
          userId: data.name, // 사용자 ID 저장
          timestamp: "timestamp", // 타임스탬프 저장
        },
      });
      documents.push(doc);
    });

    await vectorStore.addDocuments(documents);
    console.log(`✅ MemoryVectorStore에 저장 완료`);
  }

  /**
   * 사용자별 데이터 검색 (유사한 문서 찾기)
   */
  async function searchUserData(userId: string, query: string) {
    const filter = (doc: Document) => doc.metadata.userId === userId;
    const results = await vectorStore.similaritySearch(query, 3, filter);

    console.log(`🔍 ${userId}의 [query: ${query}] 검색 결과:`, results);
  }

  /**
   * 📌 RAG 기반으로 AI 답변 생성
   */
  async function generateRAGResponse(userId: string, query: string) {
    console.log(`🧐 사용자의 질문: ${query}`);

    // 🔍 유사한 문서 검색
    const filter = (doc: Document) => doc.metadata.userId === userId;
    const relevantDocs = await vectorStore.similaritySearch(query, 3, filter);

    // 📝 컨텍스트 구성
    const context = relevantDocs.map((doc) => doc.pageContent).join("\n");
    // const context =
    //   relevantDocs.length > 0
    //     ? relevantDocs
    //         .map((doc) => JSON.parse(doc.pageContent))
    //         .map((doc) => `이름: ${doc.name}, 나이: ${doc.age}`)
    //         .join("\n")
    //     : "관련 정보를 찾을 수 없습니다.";

    const promptTemplate: (
      | ChatPromptTemplate<InputValues, string>
      | BaseMessagePromptTemplateLike
    )[] = [
      [
        "system",
        "너는 사용자 데이터베이스를 기반으로 정보를 제공하는 AI야. 반드시 제공된 정보를 바탕으로만 대답해야 해.",
      ],
      ["system", `참고할 내용:\n${context.replace(/({|})/g, "$&$&")}`],
      ["human", "{input}"],
    ];

    console.log("💬 컨텍스트:", context);

    const prompt = ChatPromptTemplate.fromMessages(promptTemplate);

    const chain = prompt.pipe(llm);
    const invokeParams = {
      input: query,
    };
    console.log("invokeParams", invokeParams);
    // 💬 LLM에 질문 + 컨텍스트 전달하여 답변 생성
    const response = await chain
      .invoke(invokeParams)
      .then((res) => res.content);

    console.log(`🤖 AI 응답: ${response}`);
  }

  // ✅ 검색 실행 예제
  async function searchExample() {
    // await searchUserData("A", "LangChain 관련 정보가 필요해.");
    // await searchUserData("B", "GPT 모델은 어떻게 작동하나요?");
    await generateRAGResponse("짱구", "내 이름은?");
    await generateRAGResponse("짱아", "내 나이는?");
    await generateRAGResponse("짱구", "짱구 나이는?");
    await generateRAGResponse("짱아", "짱아 나이는?");
  }

  // await storeUserData("A", "a_user_data.csv");
  // await storeUserData("B", "b_user_data.csv");
  await storeUserData();
  searchExample();
}

main();
