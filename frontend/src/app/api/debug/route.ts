import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const debugInfo: any = {
      cwd: process.cwd(),
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      timestamp: new Date().toISOString(),
      files: {} as Record<string, boolean>,
      directories: {} as Record<string, boolean>
    };

    // Check all possible database paths
    const possiblePaths = [
      // Production Vercel paths
      path.join(process.cwd(), 'heavy_analysis3.db'),
      path.join(process.cwd(), 'src', 'heavy_analysis3.db'),
      // Local development paths
      path.join(process.cwd(), '..', 'heavy_analysis3.db'),
      './heavy_analysis3.db',
      // Additional backup paths
      path.join(__dirname, '..', '..', 'heavy_analysis3.db'),
      path.join(__dirname, '..', '..', '..', 'heavy_analysis3.db'),
    ];

    for (const dbPath of possiblePaths) {
      debugInfo.files[dbPath] = fs.existsSync(dbPath);
    }

    // Check directory contents
    try {
      const cwdContents = fs.readdirSync(process.cwd());
      debugInfo.directories[process.cwd()] = true;
      debugInfo['cwd_contents'] = cwdContents.filter(f => f.includes('heavy') || f.includes('.db'));
    } catch (e) {
      debugInfo.directories[process.cwd()] = false;
    }

    // Check if we can find any .db files
    try {
      const findDbFiles = (dir: string, maxDepth = 2): string[] => {
        if (maxDepth <= 0) return [];
        try {
          const files = fs.readdirSync(dir);
          const dbFiles: string[] = [];
          
          for (const file of files) {
            const fullPath = path.join(dir, file);
            try {
              const stat = fs.statSync(fullPath);
              if (stat.isFile() && file.endsWith('.db')) {
                dbFiles.push(fullPath);
              } else if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                dbFiles.push(...findDbFiles(fullPath, maxDepth - 1));
              }
            } catch (e) {
              // Skip files we can't read
            }
          }
          return dbFiles;
        } catch (e) {
          return [];
        }
      };

      debugInfo['found_db_files'] = findDbFiles(process.cwd());
    } catch (e) {
      debugInfo['found_db_files'] = [];
    }

    return NextResponse.json(debugInfo);
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug failed', 
      message: error instanceof Error ? error.message : 'Unknown error',
      cwd: process.cwd(),
      vercel: !!process.env.VERCEL
    }, { status: 500 });
  }
} 