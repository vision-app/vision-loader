const fs = require('fs');
const path = require('path');

const config = global.vusionConfig;
const libraryPath = path.resolve(process.cwd(), config.libraryPath);

const defaults = require('./defaults');
const _ = require('./utils');

// 生成routes，通过字符串拼接的形式
module.exports = function (content) {
    // const params = this.resourceQuery ? loaderUtils.parseQuery(this.resourceQuery) : {};

    this.cacheable();
    // 动态监听目录变化
    this.addContextDependency(libraryPath);
    // @TODO: 动态监听配置变化
    this.addDependency(config.configPath);
    this.addDependency(config.packagePath);

    // 动态生成路由
    const docLoaderViewsPath = path.resolve(__dirname, '../views');
    this.addContextDependency(docLoaderViewsPath);
    const flatRoutesList = [_.getFlatRoutes(docLoaderViewsPath)];
    const cwdViewsPath = path.resolve(process.cwd(), 'docs/views');
    if (fs.existsSync(cwdViewsPath)) {
        this.addContextDependency(cwdViewsPath);
        flatRoutesList.push(_.getFlatRoutes(cwdViewsPath));
    }
    if (config.docs && config.docs.routes)
        flatRoutesList.push(config.docs.routes);

    const routes = _.nestRoutes(_.mergeFlatRoutes(...flatRoutesList));

    // 动态生成组件
    const components = _.getComponents(libraryPath, config.docs && config.docs.components);
    const componentRoute = flatRoutesList[0]['/components'];
    componentRoute.children = components.map((component) => ({ path: component.name, fullPath: component.path }));
    if (componentRoute.children && !!componentRoute.children[0].path)
        componentRoute.children.unshift({ path: '', redirect: componentRoute.children[0].path });

    const outputs = [];
    if (config.baseCSSPath) {
        let baseCSSPath = path.resolve(process.cwd(), config.baseCSSPath);
        baseCSSPath = baseCSSPath.replace(/\\/g, '/');
        if (!fs.existsSync(baseCSSPath))
            baseCSSPath = '../components/base/base.css';
        outputs.push(`import '${baseCSSPath}';`);
    }

    const $docs = Object.assign({}, defaults, config.docs, {
        componentGroups: _.groupComponents(components),
    });
    outputs.push('const $docs = ' + JSON.stringify($docs));
    outputs.push('$docs.routes = ' + _.renderRoutes(routes));
    outputs.push('export default $docs');
    return outputs.join(';\n');
};