import type { SingleTabState } from ".";
import { determineDirectory, getSortedImageFiles } from "../../utils/fileUtils";

export type ReducedSingleTabState = {
  parentId: string | null;
  rawPath: string;
  zoom: number;
  panOffset: { x: number; y: number };
};

export namespace ReducedSingleTabState {
  export function fromFullState(
    singleTab: SingleTabState,
  ): ReducedSingleTabState {
    const rawPath =
      singleTab.directory && singleTab.imageList.length > 0
        ? singleTab.imageList[singleTab.currentIndex]
        : "";

    return {
      parentId: singleTab.parentId,
      rawPath,
      zoom: singleTab.zoom,
      panOffset: singleTab.panOffset,
    };
  }

  export async function toFullState(
    id: string,
    reduced: ReducedSingleTabState,
  ): Promise<SingleTabState> {
    const directory = reduced.rawPath
      ? determineDirectory(reduced.rawPath)
      : null;
    let imageList: string[] = [];
    let currentIndex = 0;

    if (directory) {
      imageList = await getSortedImageFiles(directory);
      currentIndex = imageList.indexOf(reduced.rawPath);
      if (currentIndex < 0) currentIndex = 0;
    }

    const fullState: SingleTabState = {
      id,
      parentId: reduced.parentId,
      directory,
      imageList,
      currentIndex,
      zoom: reduced.zoom,
      panOffset: reduced.panOffset,
    };

    return fullState;
  }
}
