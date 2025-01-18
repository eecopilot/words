import { createApp } from 'vue';
import App from './App.vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './style.css';

// 移除全局图标导入
const wordModules = import.meta.glob('./data/**/*.json', { eager: false });
const wordUnits: any[] = [];

// 加载所有单词数据
async function loadWordUnits() {
  for (const path in wordModules) {
    const mod = (await wordModules[path]()) as { default: any };
    const pathParts = path.split('/');
    const owner = pathParts[2];
    const unit = mod.default;
    unit.owner = owner;
    wordUnits.push(unit);
  }
  return wordUnits;
}

// 创建应用并挂载
const initApp = async () => {
  const app = createApp(App);

  app.use(ElementPlus);

  const units = await loadWordUnits();
  app.provide('wordUnits', units);

  app.mount('#app');
};

initApp();
