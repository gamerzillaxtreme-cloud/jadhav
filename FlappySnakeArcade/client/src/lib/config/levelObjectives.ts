export type FruitType = "apple" | "banana" | "berry" | "mango";

export type ObjectiveType = 
  | "collect_apples"
  | "collect_bananas"
  | "collect_berries"
  | "collect_mangos"
  | "collect_powerups"
  | "destroy_obstacles"
  | "enter_special_pipes"
  | "destroy_chasers";

export interface LevelObjective {
  type: ObjectiveType;
  target: number;
  description: string;
  targetFruitType?: FruitType;
}

export function getLevelObjectives(level: number): LevelObjective[] {
  const objectives: LevelObjective[] = [];
  
  if (level >= 1) {
    const fruitTypes: FruitType[] = ["apple", "banana", "berry", "mango"];
    const selectedFruit = fruitTypes[(level - 1) % 4];
    const fruitEmoji = selectedFruit === "apple" ? "🍎" : 
                       selectedFruit === "banana" ? "🍌" : 
                       selectedFruit === "berry" ? "🫐" : "🥭";
    const target = Math.min(5 + Math.floor(level / 3), 15);
    
    objectives.push({
      type: `collect_${selectedFruit}s` as ObjectiveType,
      target,
      description: `Collect ${target} ${selectedFruit}s ${fruitEmoji}`,
      targetFruitType: selectedFruit,
    });
  }
  
  if (level >= 5) {
    objectives.push({
      type: "collect_powerups",
      target: Math.min(2 + Math.floor(level / 5), 5),
      description: `Collect ${Math.min(2 + Math.floor(level / 5), 5)} power-ups`,
    });
  }
  
  if (level >= 10) {
    objectives.push({
      type: "destroy_obstacles",
      target: Math.min(3 + Math.floor(level / 10), 8),
      description: `Destroy ${Math.min(3 + Math.floor(level / 10), 8)} obstacles`,
    });
  }
  
  if (level >= 15) {
    objectives.push({
      type: "destroy_chasers",
      target: Math.min(1 + Math.floor((level - 15) / 10), 3),
      description: `Defeat ${Math.min(1 + Math.floor((level - 15) / 10), 3)} chasers`,
    });
  }
  
  const result = objectives.slice(0, 2);
  const hasFruitObjective = result.some(obj => obj.targetFruitType);
  if (!hasFruitObjective && objectives.length > 2) {
    const fruitObj = objectives.find(obj => obj.targetFruitType);
    if (fruitObj) {
      result[0] = fruitObj;
    }
  }
  return result;
}
