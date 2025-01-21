import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

// 获取所有单词文件的路径
const wordModules = import.meta.glob('./data/**/*.json', { eager: false });

// 生成文件夹和单元的基本信息
const generateUnitInfo = () => {
  const units: any[] = [];
  for (const path in wordModules) {
    const pathParts = path.split('/');
    const owner = pathParts[2];
    const fileName = pathParts[pathParts.length - 1].replace('.json', '');
    units.push({
      owner,
      name: fileName,
      path,
      words: [], // 初始为空数组，后续按需加载
      loaded: false, // 标记是否已加载数据
    });
  }
  return units;
};

// 加载指定单元的单词数据
const loadUnitWords = async (unit: any) => {
  if (unit.loaded) return unit;

  const mod = (await wordModules[unit.path]()) as { default: any };
  const data = mod.default;
  unit.words = data.words || [];
  unit.description = data.description;
  unit.loaded = true;
  return unit;
};

// 创建应用并挂载
const initApp = async () => {
  const app = createApp(App);
  const units = generateUnitInfo();
  app.provide('wordUnits', units);
  app.provide('loadUnitWords', loadUnitWords);
  app.mount('#app');
};

initApp();
