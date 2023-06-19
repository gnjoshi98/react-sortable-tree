import React from 'react';
import { ConnectDropTarget } from 'react-dnd';
import { TreeItem } from '.';
type TreePlaceholderProps = {
    children: any;
    connectDropTarget: ConnectDropTarget;
    isOver: boolean;
    canDrop: boolean;
    draggedNode: TreeItem;
    treeId: string;
    drop: any;
};
declare const TreePlaceholder: (props: TreePlaceholderProps) => React.ReactElement<any, string | React.JSXElementConstructor<any>> | null;
export default TreePlaceholder;
