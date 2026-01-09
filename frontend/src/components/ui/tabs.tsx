
import * as React from "react";

interface TabsContextType {
  value: string;
  setValue: (v: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

export function Tabs({ defaultValue, value: controlledValue, onValueChange, className = "", children }: { defaultValue?: string; value?: string; onValueChange?: (v: string) => void; className?: string; children: React.ReactNode }) {
  const isControlled = controlledValue !== undefined && onValueChange !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const value = isControlled ? controlledValue! : internalValue;
  const setValue = (v: string) => {
    if (isControlled) onValueChange!(v);
    else setInternalValue(v);
  };

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex ${className}`}>{children}</div>;
}

export function TabsTrigger({ value: tabValue, children, className = "" }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
  const active = ctx.value === tabValue;
  return (
    <button
      type="button"
      className={`px-4 py-2 rounded-t ${active ? "bg-white/10 text-indigo-400" : "bg-transparent text-white/80"} font-semibold transition ${className}`}
      onClick={() => ctx.setValue(tabValue)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value: tabValue, children, className = "" }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");
  if (ctx.value !== tabValue) return null;
  return <div className={className}>{children}</div>;
}
