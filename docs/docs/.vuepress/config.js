const moment = require("moment");
const path = require('path')
module.exports = {
    locales: {
        // 键名是该语言所属的子路径
        // 作为特例，默认语言可以使用 '/' 作为其路径。
        '/zh/': {
            lang: 'zh-CN',
            title: 'ClickVisual',
            description: '轻量级的开源日志查询、分析、报警的可视化平台'
        },
        '/en/': {
            lang: 'en-US', // 将会被设置为 <html> 的 lang 属性
            title: 'ClickVisual',
            description: 'A light weight web log visual analytic platform for clickhouse'
        },
    },
    title: "ClickVisual",
    description: "A light weight web log visual analytic platform for clickhouse",
    head: [
        ["link", {rel: "icon", href: "/icon.png"}],
        [
            "meta",
            {
                name: "keywords",
                content: "clickhouse,clickvisual",
            },
        ],
        ["script",{},`
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?be62e5a14a3d1e00cbddf78c13d37d7f";
  var s = document.getElementsByTagName("script")[0]; 
  s.parentNode.insertBefore(hm, s);
})();
        `]
    ],
    configureWebpack: () => {
        const NODE_ENV = process.env.NODE_ENV
        //判断是否是生产环境
        if(NODE_ENV === 'production'){
            return {
                output: {
                    publicPath: 'https://cdn.gocn.vip/clickvisual/'
                },
                resolve: {
                    //配置路径别名
                    alias: {
                        'public': path.resolve(__dirname, './public')
                    }
                }
            }
        }else{
            return {
                resolve: {
                    //配置路径别名
                    alias: {
                        'public': path.resolve(__dirname, './public')
                    }
                }
            }
        }
    },
    markdown: {
        lineNumbers: true, // 代码块显示行号
    },
    themeConfig: {
        locales: {
            '/': {
                nav: [
                    {
                        text: "首页",
                        link: "/zh/",
                    },
                    {
                        text: "文档",
                        link: "/zh/clickvisual/",
                    },
                    {
                        text: "API",
                        link: "https://clickvisual.gocn.vip/api",
                    },
                    {
                        text: "GitHub",
                        link: "https://github.com/clickvisual/clickvisual",
                    },
                ],
                docsDir: "docs",
                docsBranch: "master",
                editLinks: true,
                editLinkText: "在github.com上编辑此页",
            },
            '/zh/': {
                nav: [
                    {
                        text: "首页",
                        link: "/zh/",
                    },
                    {
                        text: "文档",
                        link: "/zh/clickvisual/",
                    },
                    {
                        text: "API",
                        link: "https://clickvisual.gocn.vip/api",
                    },
                    {
                        text: "GitHub",
                        link: "https://github.com/clickvisual/clickvisual",
                    },
                ],
                docsDir: "docs",
                docsBranch: "master",
                editLinks: true,
                editLinkText: "在github.com上编辑此页",
                sidebar: {
                    "/zh/clickvisual/": [
                        {
                            title: "快速开始",
                            collapsable: false, // 可选的, 默认值是 true,
                            children: [
                                "01quickstart/changelogs",
                                "/zh/clickvisual/",
                                "01quickstart/roadmap",
                                "01quickstart/experience-clickvisual-with-docker-compose",
                                "01quickstart/qa",
                            ],
                        },
                        {
                            title: "应用安装",
                            collapsable: false, // 可选的, 默认值是 true,
                            children: [
                                "02install/quick-start",
                                "02install/clickvisual-configuration-description",
                                "02install/install-introduce",
                                "02install/install-require",
                                "02install/binary-installation",
                                "02install/docker-installation",
                                "02install/k8s-installation",
                            ],
                        },
                        {
                            title: "日志采集",
                            collapsable: false, // 可选的, 默认值是 true,
                            children: [
                                "07collect/fluent-bit-configuration-reference",
                                "07collect/loggie-io",
                            ],
                        },
                        {
                            title: "功能介绍",
                            collapsable: false, // 可选的, 默认值是 true,
                            children: [
                                "03funcintro/system-settings",
                                "03funcintro/instructions",
                                "03funcintro/alarm-function-configuration-description",
                                "03funcintro/bigdata",
                                "03funcintro/casbin",
                                "03funcintro/clickhouse-commonly-used-sql",
                                "03funcintro/template-gen",
                            ],
                        },
                        {
                            title: "应用授权",
                            collapsable: false, // 可选的, 默认值是 true,
                            children: [
                                "04appauth/auth-intro",
                                "04appauth/clickvisual-auth",
                                "04appauth/auth-proxy",
                                "04appauth/gitlab-oauth2",
                                "04appauth/github-oauth2",
                            ],
                        },
                        {
                            title: "架构原理",
                            collapsable: false, // 可选的, 默认值是 true,
                            children: [
                                "05arch/graphite-document-logging-architecture",
                                "05arch/clickvisual-intro-doc",
                            ],
                        },
                        {
                            title: "加入我们",
                            collapsable: false, // 可选的, 默认值是 true,
                            children: [
                                "06join/env",
                                "06join/pr",
                                "06join/alert-push-channel",
                            ],
                        },
                    ]
                },
                sidebarDepth: 2,
                lastUpdated: "上次更新",
                serviceWorker: {
                    updatePopup: {
                        message: "发现新内容可用",
                        buttonText: "刷新",
                    },
                },
            },
            "/en/": {
                nav: [
                    {
                        text: "index",
                        link: "/en/",
                    },
                    {
                        text: "docs",
                        link: "/en/clickvisual/",
                    },
                    {
                        text: "GitHub",
                        link: "https://github.com/clickvisual/clickvisual",
                    },
                ],
                docsDir: "docs",
                docsBranch: "master",
                editLinks: true,
                editLinkText: "在github.com上编辑此页",
                sidebar: {
                    "/en/clickvisual/": [
                        {
                            title: "快速开始",
                            collapsable: false, // 可选的, 默认值是 true,
                            children: [
                                "01quickstart/roadmap",
                                "01quickstart/what-is-the-clickvisual",
                                "01quickstart/quick-learning",
                                "01quickstart/experience-clickvisual-with-docker-compose",
                                "01quickstart/qa",
                            ],
                        },
                        {
                            title: "代码贡献",
                            collapsable: false, // 可选的, 默认值是 true,
                            children: [
                                "06join/env",
                                "06join/pr",
                                "06join/alert-push-channel",
                            ],
                        },
                        {
                            title: "应用安装",
                            collapsable: false, // 可选的, 默认值是 true,
                            children: [
                                "02install/install-introduce",
                                "02install/install-require",
                                "02install/binary-installation",
                                "02install/docker-installation",
                                "02install/k8s-installation",
                            ],
                        },
                        {
                            title: "功能介绍",
                            collapsable: false, // 可选的, 默认值是 true,
                            children: [
                                "03funcintro/instructions",
                                "03funcintro/system-settings",
                                "03funcintro/subpath-configuration",
                                "03funcintro/cluster-mode",
                                "03funcintro/access-existing-tables",
                                "03funcintro/clickHouse-commonly-used-sql",
                                "03funcintro/fluent-bit-configuration-reference",
                                "03funcintro/alarm-function-configuration-description",
                                "03funcintro/clickvisual-configuration-description",
                                "03funcintro/template-gen",
                            ],
                        },
                        {
                            title: "应用授权",
                            collapsable: false, // 可选的, 默认值是 true,
                            children: [
                                "04appauth/auth-intro",
                                "04appauth/clickvisual-auth",
                                "04appauth/auth-proxy",
                                "04appauth/gitlab-oauth2",
                                "04appauth/github-oauth2",
                            ],
                        },
                        {
                            title: "架构原理",
                            collapsable: false, // 可选的, 默认值是 true,
                            children: [
                                "05arch/graphite-document-logging-architecture",
                            ],
                        },
                    ]
                },
                sidebarDepth: 2,
                lastUpdated: "上次更新",
                serviceWorker: {
                    updatePopup: {
                        message: "发现新内容可用",
                        buttonText: "刷新",
                    },
                },
            },
        },
    },
    plugins: [
        [
            "@vuepress/last-updated",
            {
                transformer: (timestamp, lang) => {
                    // 不要忘了安装 moment
                    const moment = require("moment");
                    moment.locale("zh-cn");
                    return moment(timestamp).format("YYYY-MM-DD HH:mm:ss");
                },
                dateOptions: {
                    hours12: true,
                },
            },
        ],
        "@vuepress/back-to-top",
        "@vuepress/active-header-links",
        "@vuepress/medium-zoom",
        "@vuepress/nprogress",
    ],
};
