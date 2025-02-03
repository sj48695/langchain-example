import {
  END,
  MemorySaver,
  MessagesAnnotation,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { v4 as uuidv4 } from 'uuid';

(async () => {
  const config = { configurable: { thread_id: uuidv4() } };

  const llm = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
  });

  // Define the function that calls the model
  const callModel = async (state: typeof MessagesAnnotation.State) => {
    const response = await llm.invoke(state.messages);
    // Update message history with response:
    return { messages: response };
  };

  // Define a new graph
  const workflow = new StateGraph(MessagesAnnotation)
    // Define the (single) node in the graph
    .addNode('model', callModel)
    .addEdge(START, 'model')
    .addEdge('model', END);

  // Add memory
  const memory = new MemorySaver();
  const app = workflow.compile({ checkpointer: memory });
  const input = [
    {
      role: 'user',
      content: "Hi! I'm Bob.",
    //   content: "내 이름이 뭐지?",
    },
  ];
  const output = await app.invoke({ messages: input }, config);
  // The output contains all messages in the state.
  // This will long the last message in the conversation.
  console.log(output.messages[output.messages.length - 1]);
  const state = (await app.getState(config)).values;
  console.log(state.messages);
})();
