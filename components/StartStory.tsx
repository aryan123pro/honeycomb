"use client";
import { Play } from "lucide-react";
import { useShell } from "./Shell";

export default function StartStory() {
  const { startStory } = useShell();
  return <button className="btn primary" onClick={startStory}><Play size={15} /> Start the story <span className="kbd" style={{ color: "inherit", borderColor: "currentColor" }}>S</span></button>;
}
