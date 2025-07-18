const fs = require('fs');
const path = require('path');

class TemplateEngine {
    constructor(templatesPath) {
        this.templatesPath = templatesPath;
        this.cache = new Map();
    }

    // Load and cache templates
    loadTemplate(templatePath) {
        const fullPath = path.join(this.templatesPath, templatePath);
        
        if (this.cache.has(fullPath)) {
            return this.cache.get(fullPath);
        }

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Template not found: ${templatePath}`);
        }

        const content = fs.readFileSync(fullPath, 'utf8');
        this.cache.set(fullPath, content);
        return content;
    }

    // Parse template inheritance
    parseExtends(content) {
        const extendsMatch = content.match(/\{%\s*extends\s+["']([^"']+)["']\s*%\}/);
        if (extendsMatch) {
            const parentTemplate = extendsMatch[1];
            const parentContent = this.loadTemplate(parentTemplate);
            return { parentContent, parentTemplate };
        }
        return null;
    }

    // Parse blocks
    parseBlocks(content) {
        const blocks = {};
        const blockRegex = /\{%\s*block\s+(\w+)\s*%\}([\s\S]*?)\{%\s*endblock\s*%\}/g;
        let match;

        while ((match = blockRegex.exec(content)) !== null) {
            blocks[match[1]] = match[2];
        }

        return blocks;
    }

    // Replace blocks in parent template
    replaceBlocks(parentContent, blocks) {
        let result = parentContent;
        
        // Replace block placeholders
        for (const [blockName, blockContent] of Object.entries(blocks)) {
            const blockPlaceholder = new RegExp(`\\{%\\s*block\\s+${blockName}\\s*%\\}[\\s\\S]*?\\{%\\s*endblock\\s*%\\}`, 'g');
            result = result.replace(blockPlaceholder, blockContent);
        }

        return result;
    }

    // Render variables
    renderVariables(content, context = {}) {
        let result = content;

        // Replace {{ variable }} syntax
        result = result.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, variable) => {
            const cleanVar = variable.trim();
            
            // Handle filters (e.g., {{ variable | escape }})
            if (cleanVar.includes('|')) {
                const [varName, filter] = cleanVar.split('|').map(s => s.trim());
                const value = this.getContextValue(context, varName);
                return this.applyFilter(value, filter);
            }
            
            return this.getContextValue(context, cleanVar);
        });

        // Replace {% set %} statements
        result = result.replace(/\{%\s*set\s+(\w+)\s*=\s*([^%]+)\s*%\}/g, (match, varName, value) => {
            // Simple variable assignment
            context[varName] = this.evaluateExpression(value, context);
            return '';
        });

        return result;
    }

    // Get value from context
    getContextValue(context, path) {
        const keys = path.split('.');
        let value = context;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return '';
            }
        }
        
        return value !== undefined ? value : '';
    }

    // Apply filters
    applyFilter(value, filter) {
        switch (filter) {
            case 'escape':
                return this.escapeHtml(value);
            case 'length':
                return Array.isArray(value) ? value.length : String(value).length;
            case 'upper':
                return String(value).toUpperCase();
            case 'lower':
                return String(value).toLowerCase();
            case 'capitalize':
                return String(value).charAt(0).toUpperCase() + String(value).slice(1);
            default:
                return value;
        }
    }

    // Escape HTML
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Evaluate simple expressions
    evaluateExpression(expr, context) {
        const cleanExpr = expr.trim();
        
        // Handle boolean values
        if (cleanExpr === 'true') return true;
        if (cleanExpr === 'false') return false;
        
        // Handle strings
        if (cleanExpr.startsWith('"') && cleanExpr.endsWith('"')) {
            return cleanExpr.slice(1, -1);
        }
        if (cleanExpr.startsWith("'") && cleanExpr.endsWith("'")) {
            return cleanExpr.slice(1, -1);
        }
        
        // Handle numbers
        if (/^\d+$/.test(cleanExpr)) {
            return parseInt(cleanExpr);
        }
        if (/^\d+\.\d+$/.test(cleanExpr)) {
            return parseFloat(cleanExpr);
        }
        
        // Handle method calls (e.g., variable.method())
        if (cleanExpr.includes('.') && cleanExpr.includes('()')) {
            const [varPath, method] = cleanExpr.split('.').map(s => s.trim());
            const value = this.getContextValue(context, varPath);
            const methodName = method.replace('()', '');
            
            if (typeof value === 'string' && methodName === 'lower') {
                return value.toLowerCase();
            }
            if (typeof value === 'string' && methodName === 'upper') {
                return value.toUpperCase();
            }
            
            return value;
        }
        
        // Handle variables
        return this.getContextValue(context, cleanExpr);
    }

    // Handle conditionals and loops
    processConditionals(content, context) {
        let result = content;
        
        // Handle for loops
        result = result.replace(/\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g, (match, itemVar, arrayVar, body) => {
            const array = this.getContextValue(context, arrayVar);
            if (!Array.isArray(array)) return '';
            
            return array.map(item => {
                const loopContext = { ...context, [itemVar]: item };
                return this.renderVariables(body, loopContext);
            }).join('');
        });
        
        // Simple if statements
        result = result.replace(/\{%\s*if\s+([^%]+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, (match, condition, body) => {
            const conditionResult = this.evaluateCondition(condition, context);
            return conditionResult ? body : '';
        });

        return result;
    }

    // Evaluate conditions
    evaluateCondition(condition, context) {
        const cleanCondition = condition.trim();
        
        // Handle "in" operator
        if (cleanCondition.includes(' in ')) {
            const [item, collection] = cleanCondition.split(' in ').map(s => s.trim());
            const itemValue = this.evaluateExpression(item, context);
            const collectionValue = this.getContextValue(context, collection);
            
            if (Array.isArray(collectionValue)) {
                return collectionValue.includes(itemValue);
            }
            return false;
        }
        
        // Handle comparisons
        if (cleanCondition.includes('==')) {
            const [left, right] = cleanCondition.split('==').map(s => s.trim());
            const leftValue = this.evaluateExpression(left, context);
            const rightValue = this.evaluateExpression(right, context);
            return leftValue == rightValue;
        }
        
        if (cleanCondition.includes('!=')) {
            const [left, right] = cleanCondition.split('!=').map(s => s.trim());
            const leftValue = this.evaluateExpression(left, context);
            const rightValue = this.evaluateExpression(right, context);
            return leftValue != rightValue;
        }
        
        // Handle simple variable checks
        const value = this.evaluateExpression(cleanCondition, context);
        return Boolean(value);
    }

    // Main render method
    render(templatePath, context = {}) {
        try {
            let content = this.loadTemplate(templatePath);
            
            // Handle template inheritance
            const inheritance = this.parseExtends(content);
            if (inheritance) {
                const childBlocks = this.parseBlocks(content);
                content = this.replaceBlocks(inheritance.parentContent, childBlocks);
            }
            
            // Process template directives
            content = this.processConditionals(content, context);
            content = this.renderVariables(content, context);
            
            // Convert asset paths to match our structure
            content = this.convertAssetPaths(content);
            
            return content;
        } catch (error) {
            console.error('Template rendering error:', error);
            return `<div class="alert alert-danger">Template Error: ${error.message}</div>`;
        }
    }

    // Convert asset paths to match our public folder structure
    convertAssetPaths(content) {
        let result = content;
        
        // Convert asset paths
        result = result.replace(/\/assets\/bootstrap\/css\//g, '/css/');
        result = result.replace(/\/assets\/bootstrap\/js\//g, '/js/');
        result = result.replace(/\/assets\/fa\/css\//g, '/css/');
        result = result.replace(/\/assets\/datatables\//g, '/css/');
        result = result.replace(/\/assets\/images\//g, '/images/');
        result = result.replace(/\/GetWebsiteLogo/g, '/images/hms-default-logo.png');
        
        return result;
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }
}

module.exports = TemplateEngine;
