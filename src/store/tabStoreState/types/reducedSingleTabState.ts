import type { SingleTabState } from ".";
import {
  determineDirectory,
  getSortedImageFiles,
} from "../../../utils/fileUtils";

export type ReducedSingleTabStateV2 = {
  parentId: string | null;
  rawPath: string;
  zoom: number;
  panOffset: { x: number; y: number };
};

export function fromFullState(
  singleTab: SingleTabState,
): ReducedSingleTabStateV2 {
  const rawPath =
    singleTab.directory &&
    singleTab.imageList.length > 0 &&
    singleTab.currentIndex >= 0 &&
    singleTab.currentIndex < singleTab.imageList.length
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
  reduced: ReducedSingleTabStateV2,
): Promise<SingleTabState> {
  const directory = reduced.rawPath
    ? determineDirectory(reduced.rawPath)
    : null;
  let imageList: string[] = [];
  let currentIndex = 0;

  if (directory) {
    try {
      imageList = await getSortedImageFiles(directory);
      currentIndex = imageList.indexOf(reduced.rawPath);
      if (currentIndex < 0) currentIndex = 0;
    } catch (error) {
      console.warn(
        `Failed to restore tab ${id}: could not read directory ${directory}`,
        error,
      );
    }
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

export type ReducedSingleTabStateV1 = {
  parentId: string | null;
  directory: string | null;
  currentIndex: number;
  zoom: number;
  panOffset: { x: number; y: number };
  //imageList: string[]; - this is excluded from persistence to reduce size
};
