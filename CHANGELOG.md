# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-12-23

### Added
- 项目管理：创建、编辑、删除项目
- 实时计时：对任意项目开始/停止计时
- 时间记录：每条记录独立保存，支持编辑时间、备注
- 费用计算：每条记录有自己的每小时费率，自动计算费用
- 费率管理：项目费率可调整，新费率只影响之后创建的记录
- 批量编辑：可批量修改多条记录的费率或备注
- 数据统计：实时显示项目总时长、总费用、记录数
- 本地存储：使用 Neutralino 本地存储 API，数据保存在本地
- 子项目支持：支持创建多级子项目
- 项目排序：支持按最近使用、名称排序
- 项目搜索：支持按项目名筛选
- GitHub Actions 自动构建和发布流程
- CHANGELOG.md 版本管理
