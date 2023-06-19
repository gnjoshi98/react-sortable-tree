import React from 'react';
import { VirtuosoHandle, VirtuosoProps } from 'react-virtuoso';
import './react-sortable-tree.css';
type SearchParams = {
    node: any;
    path: number[];
    treeIndex: number;
    searchQuery: string;
};
type SearchFinishCallbackParams = {
    node: any;
    path: number[];
    treeIndex: number;
}[];
type GenerateNodePropsParams = {
    node: any;
    path: number[];
    treeIndex: number;
    lowerSiblingCounts: number[];
    isSearchMatch: boolean;
    isSearchFocus: boolean;
};
type ShouldCopyOnOutsideDropParams = {
    node: any;
    prevPath: number[];
    prevTreeIndex: number;
};
type OnMoveNodeParams = {
    treeData: any[];
    node: any;
    nextParentNode: any;
    prevPath: number[];
    prevTreeIndex: number;
    nextPath: number[];
    nextTreeIndex: number;
};
type CanDropParams = {
    node: any;
    prevPath: number[];
    prevParent: any;
    prevTreeIndex: number;
    nextPath: number[];
    nextParent: any;
    nextTreeIndex: number;
};
type OnVisibilityToggleParams = {
    treeData: any[];
    node: any;
    expanded: boolean;
    path: number[];
};
type OnDragStateChangedParams = {
    isDragging: boolean;
    draggedNode: any;
};
export type ReactSortableTreeProps = {
    dragDropManager?: {
        getMonitor: () => unknown;
    };
    treeData: any[];
    style?: any;
    className?: string;
    virtuosoProps?: VirtuosoProps;
    virtuosoRef?: React.Ref<VirtuosoHandle>;
    innerStyle?: any;
    slideRegionSize?: number;
    scaffoldBlockPxWidth?: number;
    maxDepth?: number;
    searchMethod?: (params: SearchParams) => boolean;
    searchQuery?: string;
    searchFocusOffset?: number;
    searchFinishCallback?: (params: SearchFinishCallbackParams) => void;
    generateNodeProps?: (params: GenerateNodePropsParams) => any;
    treeNodeRenderer?: any;
    nodeContentRenderer?: any;
    placeholderRenderer?: any;
    theme?: {
        style: any;
        innerStyle: any;
        scaffoldBlockPxWidth: number;
        slideRegionSize: number;
        treeNodeRenderer: any;
        nodeContentRenderer: any;
        placeholderRenderer: any;
    };
    rowHeight?: number | ((treeIndex: number, node: any, path: any[]) => number);
    getNodeKey?: (node: any) => string;
    onChange: (treeData: any) => void;
    onMoveNode?: (params: OnMoveNodeParams) => void;
    canDrag?: (params: GenerateNodePropsParams) => boolean;
    canDrop?: (params: CanDropParams) => boolean;
    canNodeHaveChildren?: (node: any) => boolean;
    shouldCopyOnOutsideDrop?: (params: ShouldCopyOnOutsideDropParams) => boolean;
    onVisibilityToggle?: (params: OnVisibilityToggleParams) => void;
    dndType?: string;
    onDragStateChanged?: (params: OnDragStateChangedParams) => void;
    onlyExpandSearchedNodes?: boolean;
    rowDirection?: string;
    debugMode?: boolean;
    overscan?: number | {
        main: number;
        reverse: number;
    };
};
declare const SortableTreeWithoutDndContext: (props: ReactSortableTreeProps) => JSX.Element;
declare const SortableTree: (props: ReactSortableTreeProps) => JSX.Element;
export { SortableTreeWithoutDndContext };
export default SortableTree;
