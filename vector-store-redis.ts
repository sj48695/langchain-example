import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RedisVectorStore } from "@langchain/redis";
import csvParser from "csv-parser";
import * as fs from "fs";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createClient } from "redis";

async function main() {
  // TODO: redis 필요(rediSearch 모듈을 지원하는 Redis 서버 필요, aws elasticache 사용 X)
  const redisClient = createClient({
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  });
  redisClient.connect();

  // ✅ Embedding 모델 생성
  const embeddings = new OpenAIEmbeddings();

  // // ✅ RedisVectorStore 생성
  // const vectorStore = new RedisVectorStore(embeddings, {
  //   redisClient,
  //   indexName: "langchainjs-testing",
  // });
  const vectorStore = new MemoryVectorStore(embeddings);

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
   * 사용자별 데이터를 Embedding 후 RedisVectorStore에 저장
   */
  async function storeUserData(userId: string, filePath: string) {
    const documents = await readCSV(userId, filePath);

    await vectorStore.addDocuments(documents);
    console.log(`✅ ${userId}의 데이터 RedisVectorStore에 저장 완료`);
  }

  /**
   * 사용자별 데이터 검색 (유사한 문서 찾기)
   */
  async function searchUserData(userId: string, query: string) {
    const results = await vectorStore.similaritySearch(query, 3);

    console.log(`🔍 ${userId}의 [query: ${query}] 검색 결과:`, results);
  }

  // ✅ 검색 실행 예제
  async function searchExample() {
    await searchUserData("A", "LangChain 관련 정보가 필요해.");
    await searchUserData("B", "GPT 모델은 어떻게 작동하나요?");
  }

  await storeUserData("A", "a_user_data.csv");
  await storeUserData("B", "b_user_data.csv");
  searchExample();
}

main();
