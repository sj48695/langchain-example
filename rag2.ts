import { ChatOpenAI } from '@langchain/openai';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';

// LLM 설정
const llm = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0,
});

// 대화 이력 저장
const memory = new BufferMemory();

// ConversationChain 생성
const conversation = new ConversationChain({ llm, memory });

// 사용자의 질문 처리
async function chat() {
  console.log(await conversation.call({ input: '안녕! ' }));
  console.log(await conversation.call({ input: '내 이름이 뭐야?' })); // 이전 대화 반영
}

chat();
