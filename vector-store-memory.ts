import { Document } from '@langchain/core/documents';
import {
  BaseMessagePromptTemplateLike,
  ChatPromptTemplate,
} from '@langchain/core/prompts';
import { InputValues } from '@langchain/core/utils/types';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import csvParser from 'csv-parser';
import * as fs from 'fs';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { inspect } from 'util';

async function main() {
  // ✅ Embedding 모델 생성
  const embeddings = new OpenAIEmbeddings();
  const vectorStore = new MemoryVectorStore(embeddings);

  // ✅ LLM (GPT) 모델 설정
  const llm = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
  });

  /**
   * 사용자별 데이터를 Embedding 후 MemoryVectorStore에 저장
   */
  async function storeUserData() {
    let documents: Document[] = [];
    [
      {
        channels: [
          {
            id: 101,
            name: '프로젝트 회의',
            created_at: '2024-02-01T10:00:00Z',
            members: [
              { user_id: 1, joined_at: '2024-02-01T10:05:00Z' },
              { user_id: 2, joined_at: '2024-02-01T10:10:00Z' },
            ],
            messages: [
              {
                id: 1001,
                user_id: 1,
                text: '다음 프로젝트 일정 논의합시다.',
                timestamp: '2024-02-01T11:00:00Z',
              },
              {
                id: 1002,
                user_id: 2,
                text: '좋아요, 다음주 수요일 어떠신가요?',
                timestamp: '2024-02-01T11:05:00Z',
              },
              {
                id: 1002,
                user_id: 1,
                text: '좋아요.',
                timestamp: '2024-02-01T11:05:00Z',
              },
            ],
            notes: [
              {
                id: 2001,
                user_id: 1,
                title: '프로젝트 개요',
                content: '이번 프로젝트는 AI 기반 챗봇 개발입니다.',
                timestamp: '2024-02-01T12:00:00Z',
              },
            ],
            tasks: [
              {
                id: 3001,
                user_id: 1,
                description: '프로젝트 기획서 작성',
                status: '진행 중',
                due_date: '2024-02-05',
              },
              {
                id: 3002,
                user_id: 2,
                description: 'UI 디자인 작업',
                status: '완료',
                due_date: '2024-02-03',
              },
            ],
          },
        ],
        users: [
          {
            id: 1,
            name: '짱구',
            email: 'zzanggu@example.com',
            created_at: '2024-01-01T09:00:00Z',
          },
          {
            id: 2,
            name: '짱아',
            email: 'zzanga@example.com',
            created_at: '2024-01-02T09:00:00Z',
          },
        ],
      },
    ].map((data) => {
      const doc = new Document({
        pageContent: JSON.stringify(data), // CSV의 text 필드 저장
        metadata: {
          ...data,
          timestamp: 'timestamp', // 타임스탬프 저장
        },
      });
      documents.push(doc);
    });

    await vectorStore.addDocuments(documents);
    console.log(`✅ MemoryVectorStore에 저장 완료`);
  }

  /**
   * 📌 RAG 기반으로 AI 답변 생성
   */
  async function generateRAGResponse(query: string) {
    console.log(`🧐 사용자의 질문: ${query}`);

    // 🔍 유사한 문서 검색
    const filter = (doc: Document) => true;
    const relevantDocs = await vectorStore.similaritySearch(query, 3, filter);

    // 📝 컨텍스트 구성
    const context = relevantDocs.map((doc) => doc.pageContent).join('\n');

    const promptTemplate: (
      | ChatPromptTemplate<InputValues, string>
      | BaseMessagePromptTemplateLike
    )[] = [
      [
        'system',
        '너는 사용자 데이터베이스를 기반으로 정보를 제공하는 AI야. 반드시 제공된 정보를 바탕으로만 대답해야 해.',
      ],
      ['system', `참고할 내용:\n${context.replace(/({|})/g, '$&$&')}`],
      ['human', '{input}'],
    ];

    console.log('💬 컨텍스트:', inspect(context, { depth: 10 }));

    const prompt = ChatPromptTemplate.fromMessages(promptTemplate);

    const chain = prompt.pipe(llm);
    const invokeParams = {
      input: query,
    };
    console.log('invokeParams', invokeParams);
    // 💬 LLM에 질문 + 컨텍스트 전달하여 답변 생성
    const response = await chain
      .invoke(invokeParams)
      .then((res) => res.content);

    console.log(`🤖 AI 응답: ${response}`);
  }

  await storeUserData();
  await generateRAGResponse('프로젝트 기획서 작성 진행이 잘 되고있나?');
}

main();
