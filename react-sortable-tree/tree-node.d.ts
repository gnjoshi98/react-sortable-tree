import React, { Component } from 'react';
import { ConnectDropTarget } from 'react-dnd';
import './tree-node.css';
import { TreeItem, TreePath } from '.';
export interface TreeNode {
    node: TreeItem;
}
export interface FlatDataItem extends TreeNode, TreePath {
    lowerSiblingCounts: number[];
    parentNode: TreeItem;
}
export interface TreeRendererProps {
    treeIndex: number;
    treeId: string;
    swapFrom?: number | undefined;
    swapDepth?: number | undefined;
    swapLength?: number | undefined;
    scaffoldBlockPxWidth: number;
    lowerSiblingCounts: number[];
    rowDirection?: 'ltr' | 'rtl' | string | undefined;
    rowHeight: number | ((treeIndex: number, node: any, path: any[]) => number);
    listIndex: number;
    children: JSX.Element[];
    style?: React.CSSProperties | undefined;
    connectDropTarget: ConnectDropTarget;
    isOver: boolean;
    canDrop?: boolean | undefined;
    draggedNode?: TreeItem | undefined;
    getPrevRow: () => FlatDataItem | undefined;
    node: TreeItem;
    path: number[];
}
declare class TreeNodeComponent extends Component<TreeRendererProps> {
    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | null;
}
export default TreeNodeComponent;
