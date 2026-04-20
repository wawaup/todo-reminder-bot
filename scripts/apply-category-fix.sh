#!/bin/bash

# 应用分类修复迁移脚本
# 将数据库中的中文分类值转换为英文键名

echo "正在应用分类修复迁移..."

# 检查 Supabase CLI 是否安装
if ! command -v supabase &> /dev/null; then
    echo "错误: 未找到 Supabase CLI"
    echo "请先安装: npm install -g supabase"
    exit 1
fi

# 应用迁移
cd /Users/admin/dev/todo-reminder-bot
supabase db push

echo "迁移完成！"
echo ""
echo "数据库中的分类值已从中文转换为英文键名："
echo "  学习 → study"
echo "  健康 → health"
echo "  运动 → exercise"
echo "  作息 → sleep"
echo "  冥想 → meditation"
echo "  日常 → daily"
