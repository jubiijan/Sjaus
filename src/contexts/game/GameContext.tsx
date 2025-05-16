```typescript
import React, { createContext } from 'react';
import { GameContextType } from './types';

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = React.useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
```