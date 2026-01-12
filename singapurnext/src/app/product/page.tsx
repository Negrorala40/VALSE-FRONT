import React from 'react';
import Product from '../components/Product';
import BlogPreview from '../components/BlogPreview';

const MenuPage: React.FC = () => {
  return (
    <div>
      
      <div style={{marginTop: '1rem'}}>
        <Product />
        <BlogPreview />

      </div>
    </div>
  );
};

export default MenuPage;