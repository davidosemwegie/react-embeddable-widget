import './App.css';
import './widget/styles/style.css';

import { WidgetContainer } from './widget/components/widget-container.tsx';

function App() {
  return (
    <main>
      <WidgetContainer clientKey={'test-key'} />
    </main>
  );
}

export default App;
