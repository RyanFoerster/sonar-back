import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { readFileSync } from 'fs';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  getAssetPath(assetPath: string): string {
    // En développement, on utilise le dossier src
    const srcPath = join(__dirname, '..', 'assets', assetPath);

    try {
      readFileSync(srcPath);
      return srcPath;
    } catch (error) {
      // En production, on utilise le dossier dist
      const distPath = join(process.cwd(), 'dist', 'assets', assetPath);
      try {
        readFileSync(distPath);
        return distPath;
      } catch (error) {
        // Si on ne trouve pas le fichier, on essaie dans le dossier src
        const rootSrcPath = join(process.cwd(), 'src', 'assets', assetPath);
        try {
          readFileSync(rootSrcPath);
          return rootSrcPath;
        } catch (error) {
          this.logger.error(`Asset not found: ${assetPath}`);
          throw new Error(`Asset not found: ${assetPath}`);
        }
      }
    }
  }

  getAssetBuffer(assetPath: string): Buffer {
    try {
      const fullPath = this.getAssetPath(assetPath);
      return readFileSync(fullPath);
    } catch (error) {
      this.logger.error(`Failed to read asset: ${assetPath}`, error);
      throw error;
    }
  }
}
