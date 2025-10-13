export type ImportMap = Map<string, Set<string>>;

export function createImportMap(): ImportMap {
    return new Map();
}

export function addToImportMap(importMap: ImportMap, modulePath: string, imports: string[]): ImportMap {
    const newMap = new Map(importMap);
    const existing = newMap.get(modulePath) || new Set();
    imports.forEach(imp => existing.add(imp));
    newMap.set(modulePath, existing);
    return newMap;
}

export function mergeImportMaps(maps: ImportMap[]): ImportMap {
    const result = createImportMap();
    maps.forEach(map => {
        map.forEach((imports, modulePath) => {
            const existing = result.get(modulePath) || new Set();
            imports.forEach(imp => existing.add(imp));
            result.set(modulePath, existing);
        });
    });
    return result;
}

export function importMapToString(importMap: ImportMap): string {
    if (importMap.size === 0) return '';
    
    const imports: string[] = [];
    
    // Sort import groups: dart:, package:, relative
    const dartImports: [string, Set<string>][] = [];
    const packageImports: [string, Set<string>][] = [];
    const relativeImports: [string, Set<string>][] = [];
    
    importMap.forEach((importSet, modulePath) => {
        const entry: [string, Set<string>] = [modulePath, importSet];
        if (modulePath.startsWith('dart:')) {
            dartImports.push(entry);
        } else if (modulePath.startsWith('package:')) {
            packageImports.push(entry);
        } else {
            relativeImports.push(entry);
        }
    });
    
    // Sort within each group
    dartImports.sort(([a], [b]) => a.localeCompare(b));
    packageImports.sort(([a], [b]) => a.localeCompare(b));
    relativeImports.sort(([a], [b]) => a.localeCompare(b));
    
    // Generate import statements
    [...dartImports, ...packageImports, ...relativeImports].forEach(([modulePath, importSet]) => {
        if (importSet.size === 0) {
            imports.push(`import '${modulePath}';`);
        } else {
            const sortedImports = Array.from(importSet).sort();
            if (sortedImports.length === 1) {
                imports.push(`import '${modulePath}' show ${sortedImports[0]};`);
            } else {
                imports.push(`import '${modulePath}' show ${sortedImports.join(', ')};`);
            }
        }
    });
    
    return imports.join('\n');
}

export type GetImportFromFunction = (
    importedName: string,
    currentFilePath: string
) => string;

export function getImportFromFactory(): GetImportFromFunction {
    return (importedName: string, currentFilePath: string): string => {
        // Simple relative import logic
        // In a real implementation, this would be more sophisticated
        const parts = currentFilePath.split('/');
        const depth = parts.length - 1;
        const prefix = depth > 1 ? '../'.repeat(depth - 1) : './';
        
        // Determine the import path based on naming conventions
        if (importedName.endsWith('Account')) {
            return `${prefix}accounts/${camelCase(importedName.replace('Account', ''))}.dart`;
        }
        if (importedName.endsWith('Instruction')) {
            return `${prefix}instructions/${camelCase(importedName.replace('Instruction', ''))}.dart`;
        }
        if (importedName.endsWith('Program')) {
            return `${prefix}programs/${camelCase(importedName.replace('Program', ''))}.dart`;
        }
        if (importedName.endsWith('Error')) {
            return `${prefix}errors/${camelCase(importedName.replace('Error', ''))}.dart`;
        }
        
        // Default to types directory
        return `${prefix}types/${camelCase(importedName)}.dart`;
    };
}

function camelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
}