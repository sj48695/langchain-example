import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

async function updateVectorStore(newDocs: string[]) {
  const embeddings = new OpenAIEmbeddings();
  const vectorStore = new MemoryVectorStore(embeddings);

  for (const doc of newDocs) {
    const embedding = await embeddings.embedQuery(doc);
    console.log('embedding', embedding);
    // const exists = await vectorStore.similaritySearch(embedding, 1);

    // if (!exists.length) {
    //   await vectorStore.addDocuments([doc]);
    //   console.log('✅ 새로운 데이터 추가:', doc);
    // } else {
    //   console.log('⚠️ 이미 존재하는 데이터:', doc);
    // }
  }
}

(() => {
  updateVectorStore(['내 이름은 choco']);
})();
