/**
 * ai-scanner.js - Enhanced project scanner for generating comprehensive overview documentation
 *
 * Version: 2025.06.11
 *
 * CLASS STRUCTURE:
 * ---------------
 * Public Fields:
 *   - config {Object}: Configuration settings for the scanning process
 *   - stats {Object}: Statistics about the scanning process
 *
 * Private Fields:
 *   - #projectName {String}: Name of the parent folder being scanned
 *   - #startTime {Number}: Timestamp when scanning started
 *
 * Public Methods:
 *   - constructor(folderName, customConfig): Creates a new scanner with optional custom config
 *   - generateOverview(): Scans the project and generates an overview document
 *   - generateInitialContent(): Generates the header section of the overview
 *   - generateDirectoryStructure(dir, rootDir, depth, isLast, parentPrefixes): Generates a directory tree
 *   - processFiles(dir, rootDir, outputFile): Processes all files in the directory
 *   - shouldProcessContent(filePath, rootDir): Determines if a file should be included
 *   - formatFileSize(bytes): Formats file size in human-readable format
 *   - generateSummaryReport(): Generates a summary of the scanning process
 *
 * Dependencies:
 *   - Node.js fs/promises module
 *   - Node.js path module
 *   - Node.js crypto module (for file hashing)
 *
 * Last Modified: 2025-05-23 - Enhanced with better error handling, file hashing, and statistics
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Scan current directory instead of a specific folder
const CURRENT_DIR = '.';

class Scanner {
    #projectName;
    #startTime;

    constructor(folderName = CURRENT_DIR, customConfig = {}) {
        // Get the parent folder name to use in the output file name
        this.#projectName = this.#getProjectName(folderName);
        this.#startTime = Date.now();

        // Default configuration with ability to override
        const defaultConfig = {
            rootDir: path.resolve(__dirname, folderName),
            outputFile: path.join(__dirname, `-${this.#projectName}.txt`),
            ignoredPaths: ['LICENCE', '-scanner.js', `-${this.#projectName}.txt`, 'node_modules', '.git', 'dist', 'build', '.idea'],
            acceptedExtensions: ['.js', '.css', '.html', '.jsx', '.ts', '.tsx', '.json', '.md'],
            encoding: 'utf8',
            maxFileSize: 10 * 1024 * 1024, // 10MB limit per file
            includeHashes: true, // Option to include file checksums
            includeTOC: true, // Option to include table of contents
            includeLineCount: true, // Option to include line counts
            verboseLogging: true
        };

        this.config = { ...defaultConfig, ...customConfig };

        // Enhanced statistics
        this.stats = {
            filesProcessed: 0,
            skippedFiles: 0,
            totalSize: 0,
            totalLines: 0,
            errors: [],
            warnings: [],
            fileTypes: new Map(), // Track file type distribution
            largestFiles: [], // Track largest files
            processingTime: 0
        };
    }

    /**
     * Extracts the project name from the folder path
     * @param {String} folderPath - Path to the folder being scanned
     * @returns {String} - Name of the project (parent folder name)
     */
    #getProjectName(folderPath) {
        // If it's the current directory, get the name of the parent folder
        if (folderPath === '.' || folderPath === './' || folderPath === CURRENT_DIR) {
            return path.basename(process.cwd());
        }

        // Otherwise use the last folder name in the path
        return path.basename(path.resolve(folderPath));
    }

    /**
     * Calculate file hash for integrity checking
     * @param {String} filePath - Path to the file
     * @returns {Promise<String>} - MD5 hash of the file
     */
    async #calculateFileHash(filePath) {
        if (!this.config.includeHashes) return null;

        try {
            const fileBuffer = await fs.readFile(filePath);
            const hashSum = crypto.createHash('md5');
            hashSum.update(fileBuffer);
            return hashSum.digest('hex');
        } catch (error) {
            this.stats.warnings.push(`Failed to calculate hash for ${filePath}: ${error.message}`);
            return null;
        }
    }

    /**
     * Count lines in a file
     * @param {String} content - File content
     * @returns {Number} - Number of lines
     */
    #countLines(content) {
        return content.split('\n').length;
    }

    /**
     * Log a message if verbose logging is enabled
     * @param {String} message - Message to log
     * @param {String} level - Log level (info, warn, error)
     */
    #log(message, level = 'info') {
        if (!this.config.verboseLogging && level === 'info') return;

        const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
        const prefix = {
            info: '→',
            warn: '⚠',
            error: '✗'
        }[level] || '•';

        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    generateInitialContent() {
        const guidelines = [
            `# ${this.#projectName} Project Overview\n`,
            '## 1. Development Guidelines',
            '- Keep code **clean, simple, and optimized**.',
            '- Prioritize **clarity over cleverness**; avoid unnecessary complexity.',
            '- Maintain **consistent and meaningful naming conventions**.',
            '- Use **English** for all code and documentation.',
            '- Use **Vanilla JavaScript only** (**NO React**).',
            '- Use **Tailwind CSS** for styling.',
            '- Use **Jex.js** for DOM manipulation and debug logging.',
            '- Each class should have a comprehensive documentation header.',
            '- Use private fields/methods with # prefix where appropriate.\n',

            '## 2. AI Instructions',
            '- Do NOT give an instant analysis of this overview in the chat!',
            '- Simply respond with "OK, I\'m ready :-)" after processing this overview.',
            '- And wait for further chat request about the project.\n',

            '## 3. Configuration',
            `- **Project Name:** ${this.#projectName}`,
            `- **Ignored Paths:** ${this.config.ignoredPaths.length ? this.config.ignoredPaths.join(', ') : '(None specified)'}`,
            `- **Accepted File Extensions:** ${this.config.acceptedExtensions.join(', ')}`,
            `- **Generated on:** ${new Date().toISOString()}`,
            `- **Max File Size:** ${this.formatFileSize(this.config.maxFileSize)}`,
            `- **Include Hashes:** ${this.config.includeHashes ? 'Yes' : 'No'}`,
            `- **Include Line Count:** ${this.config.includeLineCount ? 'Yes' : 'No'}\n`,

            '## 4. Directory Structure\n',
            'The following tree represents the complete project structure:'
        ].join('\n');

        return guidelines;
    }

    async shouldProcessContent(filePath, rootDir) {
        const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
        const extension = path.extname(filePath).toLowerCase();
        const filename = path.basename(filePath);

        // Check if file matches any pattern in the ignored paths
        const isIgnored = this.config.ignoredPaths.some(ignoredPath => {
            // Support glob-like patterns
            if (ignoredPath.includes('*')) {
                const pattern = ignoredPath.replace(/\*/g, '.*');
                const regex = new RegExp(pattern);
                return regex.test(relativePath);
            }

            // Check if relativePath includes or equals any ignored path
            return relativePath === ignoredPath ||
                relativePath.startsWith(ignoredPath + '/') ||
                relativePath.includes('/' + ignoredPath + '/') ||
                filename === ignoredPath;
        });

        // Check if file is a documentation file with the dynamic name
        const isDocFile = filename === `-${this.#projectName}.txt` ||
            filename === '-scanner.js';

        // Check file size
        try {
            const stat = await fs.stat(filePath);
            if (stat.size > this.config.maxFileSize) {
                this.stats.warnings.push(`File too large (${this.formatFileSize(stat.size)}): ${relativePath}`);
                return false;
            }
        } catch (error) {
            // File might have been deleted or inaccessible
            return false;
        }

        this.#log(`Checking file: ${relativePath}`);

        return !isIgnored &&
            !isDocFile &&
            this.config.acceptedExtensions.includes(extension) &&
            !path.basename(filePath).startsWith('.');
    }

    async generateDirectoryStructure(dir, rootDir, depth = 0, isLast = true, parentPrefixes = []) {
        try {
            const files = await fs.readdir(dir);
            let structure = '';

            // Filter out files that are ignored by the config
            const validFiles = [];
            for (const file of files) {
                const filePath = path.join(dir, file);
                const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');

                // Skip documentation files with the dynamic name
                if (file === '-scanner.js' || file === `-${this.#projectName}.txt`) {
                    continue;
                }

                const isIgnored = this.config.ignoredPaths.some(ignoredPath => {
                    if (ignoredPath.includes('*')) {
                        const pattern = ignoredPath.replace(/\*/g, '.*');
                        const regex = new RegExp(pattern);
                        return regex.test(file) || regex.test(relativePath);
                    }
                    return file === ignoredPath ||
                        relativePath.startsWith(ignoredPath + '/') ||
                        relativePath.includes('/' + ignoredPath + '/');
                });

                if (!isIgnored) {
                    try {
                        const stat = await fs.stat(filePath);
                        validFiles.push({
                            name: file,
                            path: filePath,
                            isDirectory: stat.isDirectory(),
                            size: stat.size
                        });
                    } catch (error) {
                        this.#log(`Cannot stat ${filePath}: ${error.message}`, 'warn');
                    }
                }
            }

            // Sort directories first, then files alphabetically
            validFiles.sort((a, b) => (b.isDirectory - a.isDirectory) || a.name.localeCompare(b.name));

            for (let i = 0; i < validFiles.length; i++) {
                const item = validFiles[i];
                const isLastItem = i === validFiles.length - 1;

                // Build the prefix for the current line
                let prefix = parentPrefixes.map(isParentLast =>
                    isParentLast ? '    ' : '│   ').join('');
                prefix += isLastItem ? '└── ' : '├── ';

                // Add file size for non-directories if it's reasonable
                const sizeInfo = !item.isDirectory && item.size < 1024 * 1024
                    ? ` (${this.formatFileSize(item.size)})`
                    : '';

                // Add the current item to the structure
                structure += `${prefix}${item.name}${item.isDirectory ? '/' : sizeInfo}\n`;

                // Recursively process directories
                if (item.isDirectory) {
                    structure += await this.generateDirectoryStructure(
                        item.path,
                        rootDir,
                        depth + 1,
                        isLastItem,
                        [...parentPrefixes, isLastItem]
                    );
                }
            }

            return structure;
        } catch (error) {
            this.stats.errors.push(`Error reading directory ${dir}: ${error.message}`);
            return '';
        }
    }

    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes, unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * Generate a table of contents for the processed files
     * @param {Array} fileList - List of processed files with metadata
     * @returns {String} - Formatted table of contents
     */
    async generateTableOfContents(fileList) {
        if (!this.config.includeTOC || fileList.length === 0) return '';

        let toc = '\n## 6. Table of Contents\n\n';
        toc += '| File | Type | Size | Lines |\n';
        toc += '|------|------|------|-------|\n';

        fileList.forEach(file => {
            const lineInfo = this.config.includeLineCount ? `${file.lines}` : 'N/A';
            toc += `| ${file.path} | ${file.type} | ${file.size} | ${lineInfo} |\n`;
        });

        return toc + '\n';
    }

    async processFiles(dir, rootDir, outputFile) {
        const processedFiles = [];

        const processDirectory = async (currentDir) => {
            try {
                const files = await fs.readdir(currentDir);

                for (const file of files) {
                    const filePath = path.join(currentDir, file);

                    try {
                        const stat = await fs.stat(filePath);

                        // Skip scanner js and documentation file with dynamic name
                        if (file === '-scanner.js' || file === `-${this.#projectName}.txt`) {
                            continue;
                        }

                        if (stat.isDirectory()) {
                            await processDirectory(filePath);
                        } else {
                            if (await this.shouldProcessContent(filePath, rootDir)) {
                                const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
                                const fileContent = await fs.readFile(filePath, this.config.encoding);
                                const extension = path.extname(filePath).toLowerCase();
                                const fileSize = stat.size;
                                const hash = await this.#calculateFileHash(filePath);
                                const lines = this.config.includeLineCount ? this.#countLines(fileContent) : 0;

                                // Update statistics
                                this.stats.totalSize += fileSize;
                                this.stats.totalLines += lines;

                                // Track file type distribution
                                const fileType = extension.slice(1).toUpperCase() || 'NONE';
                                this.stats.fileTypes.set(fileType, (this.stats.fileTypes.get(fileType) || 0) + 1);

                                // Track largest files
                                this.stats.largestFiles.push({ path: relativePath, size: fileSize });
                                this.stats.largestFiles.sort((a, b) => b.size - a.size);
                                this.stats.largestFiles = this.stats.largestFiles.slice(0, 10);

                                const separatorParts = [
                                    '\n',
                                    '='.repeat(80),
                                    `FILE: ${relativePath}`,
                                    `Type: ${fileType}`,
                                    `Size: ${this.formatFileSize(fileSize)}`,
                                    `Last Modified: ${stat.mtime.toISOString()}`
                                ];

                                if (this.config.includeLineCount) {
                                    separatorParts.push(`Lines: ${lines}`);
                                }

                                if (hash) {
                                    separatorParts.push(`MD5: ${hash}`);
                                }

                                separatorParts.push('='.repeat(80), '\n');

                                const separator = separatorParts.join('\n');

                                await fs.appendFile(outputFile, `${separator}${fileContent}\n`);

                                processedFiles.push({
                                    path: relativePath,
                                    type: fileType,
                                    size: this.formatFileSize(fileSize),
                                    lines: lines
                                });

                                this.stats.filesProcessed++;
                                this.#log(`Processed: ${relativePath}`);
                            } else {
                                this.stats.skippedFiles++;
                            }
                        }
                    } catch (error) {
                        this.stats.errors.push(`Error processing ${filePath}: ${error.message}`);
                        this.#log(`Error processing ${filePath}: ${error.message}`, 'error');
                    }
                }
            } catch (error) {
                this.stats.errors.push(`Error reading directory ${currentDir}: ${error.message}`);
                this.#log(`Error reading directory ${currentDir}: ${error.message}`, 'error');
            }
        };

        await processDirectory(dir);
        return processedFiles;
    }

    /**
     * Generate a comprehensive summary report
     * @returns {String} - Formatted summary report
     */
    generateSummaryReport() {
        this.stats.processingTime = Date.now() - this.#startTime;

        let report = '\n## 7. Summary Report\n\n';
        report += '### Statistics\n';
        report += `- **Files Processed:** ${this.stats.filesProcessed}\n`;
        report += `- **Files Skipped:** ${this.stats.skippedFiles}\n`;
        report += `- **Total Size:** ${this.formatFileSize(this.stats.totalSize)}\n`;

        if (this.config.includeLineCount) {
            report += `- **Total Lines:** ${this.stats.totalLines.toLocaleString()}\n`;
        }

        report += `- **Processing Time:** ${(this.stats.processingTime / 1000).toFixed(2)} seconds\n`;
        report += `- **Errors:** ${this.stats.errors.length}\n`;
        report += `- **Warnings:** ${this.stats.warnings.length}\n\n`;

        // File type distribution
        if (this.stats.fileTypes.size > 0) {
            report += '### File Type Distribution\n';
            const sortedTypes = Array.from(this.stats.fileTypes.entries())
                .sort((a, b) => b[1] - a[1]);

            sortedTypes.forEach(([type, count]) => {
                const percentage = ((count / this.stats.filesProcessed) * 100).toFixed(1);
                report += `- **${type}:** ${count} files (${percentage}%)\n`;
            });
            report += '\n';
        }

        // Largest files
        if (this.stats.largestFiles.length > 0) {
            report += '### Largest Files\n';
            this.stats.largestFiles.slice(0, 5).forEach((file, index) => {
                report += `${index + 1}. ${file.path} - ${this.formatFileSize(file.size)}\n`;
            });
            report += '\n';
        }

        // Errors and warnings
        if (this.stats.errors.length > 0) {
            report += '### Errors Encountered\n';
            this.stats.errors.forEach(err => report += `- ${err}\n`);
            report += '\n';
        }

        if (this.stats.warnings.length > 0) {
            report += '### Warnings\n';
            this.stats.warnings.forEach(warn => report += `- ${warn}\n`);
            report += '\n';
        }

        return report;
    }

    async generateOverview() {
        console.log(`\n📁 Starting project documentation generation for "${this.#projectName}"...\n`);

        try {
            // Delete existing file if it exists
            await fs.unlink(this.config.outputFile).catch(err => {
                if (err.code !== 'ENOENT') throw err;
            });

            // Generate and write initial content
            const initialContent = this.generateInitialContent();
            await fs.writeFile(this.config.outputFile, initialContent);

            // Generate and append directory structure
            this.#log('Generating complete directory structure...');
            const directoryStructure = `${path.basename(this.config.rootDir)}/\n${
                await this.generateDirectoryStructure(this.config.rootDir, this.config.rootDir)
            }`;
            await fs.appendFile(this.config.outputFile, directoryStructure + '\n\n\n## 5. File Content\nBelow are the contents of all processed files in the project:\n');

            // Process remaining files
            this.#log('Processing files (excluding ignored paths)...');
            const processedFiles = await this.processFiles(this.config.rootDir, this.config.rootDir, this.config.outputFile);

            // Generate and append table of contents
            const toc = await this.generateTableOfContents(processedFiles);
            if (toc) {
                await fs.appendFile(this.config.outputFile, toc);
            }

            // Generate and append summary report
            const summaryReport = this.generateSummaryReport();
            await fs.appendFile(this.config.outputFile, summaryReport);

            // Final success message with emoji indicators
            console.log('\n✅ Project documentation generated successfully!\n');
            console.log(`📄 Documentation saved as: ${this.config.outputFile}`);
            console.log(`📊 Files processed: ${this.stats.filesProcessed}`);
            console.log(`⏭️  Files skipped: ${this.stats.skippedFiles}`);
            console.log(`💾 Total size: ${this.formatFileSize(this.stats.totalSize)}`);

            if (this.config.includeLineCount) {
                console.log(`📝 Total lines: ${this.stats.totalLines.toLocaleString()}`);
            }

            console.log(`⏱️  Processing time: ${(this.stats.processingTime / 1000).toFixed(2)} seconds`);
            console.log(`${this.stats.errors.length > 0 ? '❌' : '✅'} Errors: ${this.stats.errors.length}`);
            console.log(`${this.stats.warnings.length > 0 ? '⚠️' : '✅'} Warnings: ${this.stats.warnings.length}`);

            if (this.stats.errors.length > 0) {
                console.log('\n❌ Errors encountered:');
                this.stats.errors.forEach(err => console.error(`   - ${err}`));
            }

            if (this.stats.warnings.length > 0) {
                console.log('\n⚠️  Warnings:');
                this.stats.warnings.forEach(warn => console.warn(`   - ${warn}`));
            }

            console.log('\n' + '─'.repeat(60) + '\n');

        } catch (error) {
            console.error('❌ Failed to generate project documentation:', error);
            throw error;
        }
    }
}

async function main() {
    // Example with custom configuration
    const customConfig = {
        // ignoredPaths: ['node_modules', '.git', 'dist', 'build', '*.test.js'],
        // acceptedExtensions: ['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json'],
        // includeHashes: true,
        // maxFileSize: 5 * 1024 * 1024, // 5MB
        // verboseLogging: false
    };

    const scanner = new Scanner(CURRENT_DIR, customConfig);
    await scanner.generateOverview().catch(error =>
        console.error(`Failed to process current directory:`, error)
    );
}

// Allow the scanner to be imported as a module
if (require.main === module) {
    main().catch(console.error);
}

module.exports = Scanner;