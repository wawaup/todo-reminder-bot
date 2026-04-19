#!/bin/bash
SUPABASE_URL=https://wbwjlqnuuojyusgpkqlb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indid2pscW51dW9qeXVzZ3BrcWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDEwNjAsImV4cCI6MjA5MjE3NzA2MH0.i7IXamEpY3HPNrW8ewhQI8Ip4DpHRDbvfJbkx9f24gw

# 测试定时任务配置脚本
# 用于验证 check-reminders 和 daily-reminder 函数是否正常工作

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查环境变量
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}错误：请设置环境变量${NC}"
    echo "export SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co"
    echo "export SUPABASE_ANON_KEY=YOUR_ANON_KEY"
    exit 1
fi

echo -e "${YELLOW}开始测试定时任务...${NC}\n"

# 测试 check-reminders
echo -e "${YELLOW}1. 测试 check-reminders 函数${NC}"
response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/check-reminders" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json")

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ check-reminders 测试成功${NC}"
    echo "$response" | jq '.'
else
    echo -e "${RED}✗ check-reminders 测试失败${NC}"
    echo "$response"
fi

echo ""

# 测试 daily-reminder
echo -e "${YELLOW}2. 测试 daily-reminder 函数${NC}"
response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/daily-reminder" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json")

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ daily-reminder 测试成功${NC}"
    echo "$response" | jq '.'
else
    echo -e "${RED}✗ daily-reminder 测试失败${NC}"
    echo "$response"
fi

echo ""
echo -e "${GREEN}测试完成！${NC}"
