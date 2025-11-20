
import { GoogleGenAI } from "@google/genai";
import { GameStats } from "../types";
import { GAME_CONFIG, UPGRADE_DEFINITIONS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSurvivalReport = async (stats: GameStats): Promise<string> => {
  try {
    // Format inventory for the prompt
    const loadout = Object.entries(stats.inventory)
      .filter(([_, level]) => level > 0)
      .map(([key, level]) => {
        const def = UPGRADE_DEFINITIONS.find(u => u.id === key);
        const name = def ? def.title : key;
        const isMaxed = level >= 5;
        return `${name} ${isMaxed ? '(觉醒)' : `Lv.${level}`}`;
      })
      .join(', ') || "基础手枪";

    const difficultyName = {
      'EASY': '休闲模式',
      'NORMAL': '标准模式',
      'HARD': '炼狱模式'
    }[stats.difficulty];

    const prompt = `
      你是一个赛博朋克风格的末日生存记录员。
      一名代号"零号"的幸存者刚刚在尸潮中阵亡。
      请写一段简短、冷酷、戏剧性的中文“死亡日志”（2-3句话）。
      
      战斗数据:
      - 难度: ${difficultyName}
      - 等级: ${stats.level}
      - 存活波数: ${stats.wave}
      - 击杀丧尸: ${stats.kills}
      - 核心装备: ${loadout}
      - 存活时间: ${Math.floor(stats.timeSurvived / 1000)} 秒

      注意:
      如果玩家拥有“龙之契约”或“支援无人机”，请提到他的机械/生物伙伴。
      如果使用了“微型导弹”或“感应地雷”，请提到爆炸的火光。
      如果击杀数超过1500，称其为“末日收割者”。
      语气要沉重，但也带有一丝对逝者的敬意。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "信号中断。幸存者状态：未知。";
  } catch (error) {
    console.error("Failed to generate report:", error);
    return "传输失败。尸潮吞没了信号。";
  }
};
