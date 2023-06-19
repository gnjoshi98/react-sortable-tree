import { FullTree, GetNodeKeyFunction, NodeData, SearchData, TreeIndex, TreeItem, TreeNode, TreePath } from '..';
export type WalkAndMapFunctionParameters = FullTree & {
    getNodeKey: GetNodeKeyFunction;
    callback: Function;
    ignoreCollapsed?: boolean | undefined;
};
export interface FlatDataItem extends TreeNode, TreePath {
    lowerSiblingCounts: number[];
    parentNode: TreeItem;
}
export declare const getDescendantCount: ({ node, ignoreCollapsed, }: TreeNode & {
    ignoreCollapsed?: boolean | undefined;
}) => number;
export declare const getVisibleNodeCount: ({ treeData }: FullTree) => number;
export declare const getVisibleNodeInfoAtIndex: ({ treeData, index: targetIndex, getNodeKey, }: FullTree & {
    index: number;
    getNodeKey: GetNodeKeyFunction;
}) => (TreeNode & TreePath & {
    lowerSiblingCounts: number[];
}) | null;
export declare const walk: ({ treeData, getNodeKey, callback, ignoreCollapsed, }: WalkAndMapFunctionParameters) => void;
export declare const map: ({ treeData, getNodeKey, callback, ignoreCollapsed, }: WalkAndMapFunctionParameters) => TreeItem[];
export declare const toggleExpandedForAll: ({ treeData, expanded, }: FullTree & {
    expanded?: boolean | undefined;
}) => TreeItem[];
export declare const changeNodeAtPath: ({ treeData, path, newNode, getNodeKey, ignoreCollapsed, }: FullTree & TreePath & {
    newNode: Function | any;
    getNodeKey: GetNodeKeyFunction;
    ignoreCollapsed?: boolean | undefined;
}) => TreeItem[];
export declare const removeNodeAtPath: ({ treeData, path, getNodeKey, ignoreCollapsed, }: FullTree & TreePath & {
    getNodeKey: GetNodeKeyFunction;
    ignoreCollapsed?: boolean | undefined;
}) => TreeItem[];
export declare const removeNode: ({ treeData, path, getNodeKey, ignoreCollapsed, }: FullTree & TreePath & {
    getNodeKey: GetNodeKeyFunction;
    ignoreCollapsed?: boolean | undefined;
}) => (FullTree & TreeNode & TreeIndex) | undefined;
export declare const getNodeAtPath: ({ treeData, path, getNodeKey, ignoreCollapsed, }: FullTree & TreePath & {
    getNodeKey: GetNodeKeyFunction;
    ignoreCollapsed?: boolean | undefined;
}) => (TreeNode & TreeIndex) | null;
export declare const addNodeUnderParent: ({ treeData, newNode, parentKey, getNodeKey, ignoreCollapsed, expandParent, addAsFirstChild, }: FullTree & {
    newNode: TreeItem;
    parentKey?: number | string | undefined | null;
    getNodeKey: GetNodeKeyFunction;
    ignoreCollapsed?: boolean | undefined;
    expandParent?: boolean | undefined;
    addAsFirstChild?: boolean | undefined;
}) => FullTree & TreeIndex;
export declare const insertNode: ({ treeData, depth: targetDepth, minimumTreeIndex, newNode, getNodeKey, ignoreCollapsed, expandParent, }: FullTree & {
    depth: number;
    newNode: TreeItem;
    minimumTreeIndex: number;
    ignoreCollapsed?: boolean | undefined;
    expandParent?: boolean | undefined;
    getNodeKey: GetNodeKeyFunction;
}) => FullTree & TreeIndex & TreePath & {
    parentNode: TreeItem | null;
};
export declare const getFlatDataFromTree: ({ treeData, getNodeKey, ignoreCollapsed, }: FullTree & {
    getNodeKey: GetNodeKeyFunction;
    ignoreCollapsed?: boolean | undefined;
}) => FlatDataItem[];
export declare const getTreeFromFlatData: ({ flatData, getKey, getParentKey, rootKey, }: {
    flatData: any;
    getKey?: ((node: any) => any) | undefined;
    getParentKey?: ((node: any) => any) | undefined;
    rootKey?: string | undefined;
}) => any;
export declare const isDescendant: (older: TreeItem, younger: TreeItem) => boolean;
export declare const getDepth: (node: TreeItem, depth?: number) => number;
export declare const find: ({ getNodeKey, treeData, searchQuery, searchMethod, searchFocusOffset, expandAllMatchPaths, expandFocusMatchPaths, }: FullTree & {
    getNodeKey: GetNodeKeyFunction;
    searchQuery?: string | number | undefined;
    searchMethod: (data: SearchData) => boolean;
    searchFocusOffset?: number | undefined;
    expandAllMatchPaths?: boolean | undefined;
    expandFocusMatchPaths?: boolean | undefined;
}) => {
    matches: NodeData[];
} & FullTree;
