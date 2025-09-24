import { useTabStore, isSingleTab, isComparisonTab } from "../store";

describe("tab store", () => {
  beforeEach(() => {
    // reset store state safely using setState so store methods remain intact
    useTabStore.setState({
      tabs: new Map(),
      tabOrder: [],
      activeTabId: null,
    } as any);
  });

  test("addSingleTab adds a tab and sets activeTabId", () => {
    const id = useTabStore
      .getState()
      .addSingleTab("/dir", ["a.png", "b.png"], 0);
    const s = useTabStore.getState();
    expect(s.tabs.get(id)).toBeDefined();
    expect(s.activeTabId).toBe(id);
    expect(isSingleTab(s.tabs.get(id)!)).toBe(true);
  });

  test("addComparisonTab creates comparison tab with children", () => {
    const child1 = {
      id: "c1",
      type: "single",
      directory: null,
      imageList: ["x"],
      currentIndex: 0,
    } as any;
    const child2 = {
      id: "c2",
      type: "single",
      directory: null,
      imageList: ["y"],
      currentIndex: 0,
    } as any;
    const id = useTabStore.getState().addComparisonTab([child1, child2], 0);
    const tab = useTabStore.getState().tabs.get(id) as any;
    expect(tab).toBeDefined();
    expect(isComparisonTab(tab)).toBe(true);
    expect((tab as any).childrenOrder.length).toBe(2);
  });

  test("createComparisonFromSingleIds moves selected singles into comparison", () => {
    // create three single tabs
    const a = useTabStore.getState().addSingleTab(null, ["a"], 0);
    const b = useTabStore.getState().addSingleTab(null, ["b"], 0);
    useTabStore.getState().addSingleTab(null, ["c"], 0);
    // create comparison from a and b
    useTabStore.getState().createComparisonFromSingleIds([a, b]);
    // after mutation, re-read state
    const stateAfter = useTabStore.getState();
    const active = stateAfter.activeTabId;
    expect(active).toBeTruthy();
    const tab = stateAfter.tabs.get(active!);
    expect(tab).toBeDefined();
    expect((tab as any).type).toBe("comparison");
    // moved singles should not exist as top-level tabs
    expect(stateAfter.tabs.get(a)).toBeUndefined();
    expect(stateAfter.tabs.get(b)).toBeUndefined();
  });

  test("setCurrentIndex updates single and child indices", () => {
    const id = useTabStore.getState().addSingleTab(null, ["one", "two"], 0);
    useTabStore.getState().setCurrentIndex(id, 1);
    expect(
      useTabStore.getState().tabs.get(id) &&
        (useTabStore.getState().tabs.get(id) as any).currentIndex,
    ).toBe(1);

    // comparison child
    const child = {
      id: "ch",
      type: "single",
      directory: null,
      imageList: ["i1", "i2"],
      currentIndex: 0,
    } as any;
    const compId = useTabStore.getState().addComparisonTab([child], 0);
    // set index on child
    useTabStore.getState().setCurrentIndex(child.id, 1);
    const comp = useTabStore.getState().tabs.get(compId) as any;
    expect(comp.children.get(child.id).currentIndex).toBe(1);
  });

  test("reorderComparisonChildren adjusts activeSlotIndex correctly", () => {
    const c1 = {
      id: "c1",
      type: "single",
      directory: null,
      imageList: ["a"],
      currentIndex: 0,
    } as any;
    const c2 = {
      id: "c2",
      type: "single",
      directory: null,
      imageList: ["b"],
      currentIndex: 0,
    } as any;
    const c3 = {
      id: "c3",
      type: "single",
      directory: null,
      imageList: ["c"],
      currentIndex: 0,
    } as any;
    const compId = useTabStore.getState().addComparisonTab([c1, c2, c3], 1); // activeSlotIndex = 1
    useTabStore.getState().reorderComparisonChildren(compId, 1, 0); // move active from 1->0
    const comp = useTabStore.getState().tabs.get(compId) as any;
    expect(comp.childrenOrder[0]).toBe(c2.id);
    expect(comp.activeSlotIndex).toBe(0);
  });

  test("detachChildToTopLevel and detachAllChildren behave correctly", () => {
    const c1 = {
      id: "d1",
      type: "single",
      directory: null,
      imageList: ["a"],
      currentIndex: 0,
    } as any;
    const c2 = {
      id: "d2",
      type: "single",
      directory: null,
      imageList: ["b"],
      currentIndex: 0,
    } as any;
    const compId = useTabStore.getState().addComparisonTab([c1, c2], 0);
    // detach one child
    useTabStore.getState().detachChildToTopLevel(compId, c1.id, true);
    // ensure child now exists as top-level
    expect(useTabStore.getState().tabs.get(c1.id)).toBeDefined();

    // detach all (on the remaining comp) will expand remaining children
    // create a new comparison for testing detachAllChildren
    const a = useTabStore.getState().addSingleTab(null, ["x"], 0);
    const b = useTabStore.getState().addSingleTab(null, ["y"], 0);
    useTabStore.getState().createComparisonFromSingleIds([a, b]);
    // comp2 modifies store; find the new comparison id
    const newCompId = useTabStore.getState().activeTabId!;
    useTabStore.getState().detachAllChildren(newCompId);
    // after detachAllChildren, the comparison should be removed
    expect(useTabStore.getState().tabs.get(newCompId)).toBeUndefined();
  });
});
