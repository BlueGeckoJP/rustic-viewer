import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ComparisonView from "../ComparisonView";
import { useTabStore } from "../../store";

// Mock SlotCanvas to avoid decode complexity; we'll assert its usage by title text
jest.mock("../SlotCanvas", () => ({
  __esModule: true,
  default: ({ rawPath }: { rawPath: string }) => (
    <div data-testid="slot-canvas">{rawPath}</div>
  ),
}));

describe("ComparisonView", () => {
  beforeEach(() => {
    useTabStore.setState({
      tabs: new Map(),
      tabOrder: [],
      activeTabId: null,
    } as any);
    // mock canvas getContext globally so any nested ImageCanvas tests won't error
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

  test("renders children and clicking sets active slot", async () => {
    // create two single tabs to use as children
    const a = useTabStore.getState().addSingleTab("/d", ["/x/a.png"], 0);
    const b = useTabStore.getState().addSingleTab("/d", ["/x/b.png"], 0);

    const compId = useTabStore
      .getState()
      .addComparisonTab(
        [
          useTabStore.getState().getSingleTab(a) as any,
          useTabStore.getState().getSingleTab(b) as any,
        ],
        0,
      );

    // ensure active tab points to comparison
    useTabStore.setState({ activeTabId: compId } as any);

    render(<ComparisonView tabId={compId} />);

    // slot canvases should render with file paths
    const slots = await screen.findAllByTestId("slot-canvas");
    expect(slots).toHaveLength(2);
    expect(slots[0]).toHaveTextContent("/x/a.png");
    expect(slots[1]).toHaveTextContent("/x/b.png");

    // clicking second slot sets activeSlotIndex on the comparison tab
    const secondSlot = screen.getByText("b.png");
    await userEvent.click(secondSlot);
    const tab = useTabStore.getState().tabs.get(compId) as any;
    expect(tab.activeSlotIndex).toBe(1);
  });

  test("child navigation buttons update child's currentIndex", async () => {
    const a = useTabStore
      .getState()
      .addSingleTab("/d", ["a1.png", "a2.png"], 0);
    const b = useTabStore
      .getState()
      .addSingleTab("/d", ["b1.png", "b2.png"], 0);

    // move the two singles into a comparison (this removes top-level singles)
    useTabStore.getState().createComparisonFromSingleIds([a, b]);
    const compId = useTabStore.getState().activeTabId as string;
    expect(compId).toBeTruthy();

    render(<ComparisonView tabId={compId} />);

    const nextButtons = screen.getAllByText("▶");
    expect(nextButtons.length).toBeGreaterThanOrEqual(2);

    // Click the second child's next button
    await userEvent.click(nextButtons[1]);

    // child's currentIndex inside the comparison should now be 1
    const comp = useTabStore.getState().tabs.get(compId) as any;
    const bId = comp.childrenOrder[1];
    expect(comp.children.get(bId).currentIndex).toBe(1);
  });
});
