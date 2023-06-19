import React from 'react';
import './placeholder-renderer-default.css';
import { TreeItem } from '.';
export interface PlaceholderRendererProps {
    isOver: boolean;
    canDrop: boolean;
    draggedNode: TreeItem;
}
declare const PlaceholderRendererDefault: React.FC<PlaceholderRendererProps>;
export default PlaceholderRendererDefault;
