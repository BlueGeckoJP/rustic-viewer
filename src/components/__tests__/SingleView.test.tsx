import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SingleView from "../SingleView";
import { useTabStore } from "../../store";

// Mock decodeImageFromPath
jest.mock("../../utils/imageDecoder", () => ({
  decodeImageFromPath: jest.fn(async () => new ImageData(1, 1)),
}));

describe("SingleView", () => {
  beforeEach(() => {
    // reset store
    useTabStore.setState({
      tabs: new Map(),
      tabOrder: [],
      activeTabId: null,
    } as any);
    // mock canvas context to avoid jsdom not-implemented errors
    const fakeCtx = {
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      setTransform: jest.fn(),
      scale: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
    } as unknown as CanvasRenderingContext2D;
    HTMLCanvasElement.prototype.getContext = jest.fn(() => fakeCtx as any);
  });

  test("shows loading and filename when image loads", async () => {
    const id = useTabStore
      .getState()
      .addSingleTab("/some/dir", ["/some/dir/img.png"], 0);
    // ensure active tab is set
    useTabStore.setState({ activeTabId: id } as any);

    render(<SingleView />);

    // Loading overlay should briefly appear (decode is async)
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();

    // Wait for decode to finish and file name to appear
    await waitFor(() =>
      expect(screen.getByText("img.png")).toBeInTheDocument()
    );
  });

  test("ArrowRight navigation updates index and triggers decode", async () => {
    const mockDecode = (await import("../../utils/imageDecoder"))
      .decodeImageFromPath as jest.MockedFunction<any>;
    const id = useTabStore.getState().addSingleTab("/d", ["a.png", "b.png"], 0);
    useTabStore.setState({ activeTabId: id } as any);

    render(<SingleView />);

    // initial load should have been called at least once
    await waitFor(() => expect(mockDecode).toHaveBeenCalled());

    const initialCalls = mockDecode.mock.calls.length;

    // Press ArrowRight to navigate to next image
    await userEvent.keyboard("{ArrowRight}");

    // setCurrentIndex should have updated store
    expect((useTabStore.getState().tabs.get(id) as any).currentIndex).toBe(1);

    // decode should be called again for the new image (at least one new call)
    await waitFor(() =>
      expect(mockDecode.mock.calls.length).toBeGreaterThanOrEqual(
        initialCalls + 1
      )
    );
  });
});
