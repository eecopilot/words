import type { Unit, WordData } from '../types';

// 自动导入所有 JSON 文件
const modules = import.meta.glob<{ default: Unit }>('./*/unit*.json', {
  eager: true,
});

// 按文件夹组织数据
export const wordData: WordData = Object.entries(modules).reduce(
  (acc, [path, module]) => {
    try {
      // 从路径中提取文件夹名称
      const folderMatch = path.match(/\.\/([^/]+)\//);
      if (!folderMatch) return acc;

      const folder = folderMatch[1];
      if (!acc[folder]) {
        acc[folder] = [];
      }

      // 添加单元数据
      acc[folder].push({
        ...module.default,
        owner: folder,
      });
    } catch (err) {
      console.error('Error processing module:', path, err);
    }
    return acc;
  },
  {} as WordData
);

// 获取所有文件夹
export const getFolders = () => Object.keys(wordData);

// 获取指定文件夹的单元数据
export const getFolderUnits = (folder: keyof WordData) =>
  wordData[folder] || [];

// 导出完整数据
export default wordData;
