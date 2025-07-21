'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Save, Trash2, Eye } from 'lucide-react';

interface SchemaField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'nested';
  required: boolean;
  children?: SchemaField[];
}

interface SavedSchema {
  id: string;
  name: string;
  schema: Record<string, string | Record<string, unknown>>;
  fields: SchemaField[];
  createdAt: string;
}

const JsonSchemaBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'builder' | 'database'>('builder');
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [savedSchemas, setSavedSchemas] = useState<SavedSchema[]>([]);
  const [schemaName, setSchemaName] = useState('');

  // Load saved schemas from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('jsonSchemas');
    if (saved) {
      setSavedSchemas(JSON.parse(saved));
    }
  }, []);

  const addField = (parentId?: string) => {
    const newField: SchemaField = {
      id: Date.now().toString(),
      name: '',
      type: 'string',
      required: false,
      children: []
    };

    if (parentId) {
      // Add to nested field
      const updateNestedField = (fields: SchemaField[]): SchemaField[] => {
        return fields.map(field => {
          if (field.id === parentId) {
            return {
              ...field,
              children: [...(field.children || []), newField]
            };
          }
          if (field.children) {
            return {
              ...field,
              children: updateNestedField(field.children)
            };
          }
          return field;
        });
      };
      
      setFields(updateNestedField(fields));
    } else {
      // Add to root level
      setFields([...fields, newField]);
    }
  };

  const removeField = (fieldId: string, parentId?: string) => {
    if (parentId) {
      // Remove from nested field
      const updateNestedField = (fields: SchemaField[]): SchemaField[] => {
        return fields.map(field => {
          if (field.id === parentId) {
            return {
              ...field,
              children: field.children?.filter(child => child.id !== fieldId) || []
            };
          }
          if (field.children) {
            return {
              ...field,
              children: updateNestedField(field.children)
            };
          }
          return field;
        });
      };
      
      setFields(updateNestedField(fields));
    } else {
      // Remove from root level
      setFields(fields.filter(field => field.id !== fieldId));
    }
  };

  const updateField = (fieldId: string, updates: Partial<SchemaField>, parentId?: string) => {
    if (parentId) {
      // Update nested field
      const updateNestedField = (fields: SchemaField[]): SchemaField[] => {
        return fields.map(field => {
          if (field.id === parentId) {
            return {
              ...field,
              children: field.children?.map(child => 
                child.id === fieldId ? { ...child, ...updates } : child
              ) || []
            };
          }
          if (field.children) {
            return {
              ...field,
              children: updateNestedField(field.children)
            };
          }
          return field;
        });
      };
      
      setFields(updateNestedField(fields));
    } else {
      // Update root level field
      setFields(fields.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      ));
    }
  };

  const generateJsonSchema = (fields: SchemaField[]): Record<string, string | Record<string, unknown>> => {
    const schema: Record<string, string | Record<string, unknown>> = {};
    
    fields.forEach(field => {
      if (field.name.trim()) {
        if (field.type === 'nested' && field.children) {
          schema[field.name] = generateJsonSchema(field.children);
        } else {
          schema[field.name] = field.type.toUpperCase();
        }
      }
    });
    
    return schema;
  };

  const saveSchema = () => {
    if (!schemaName.trim()) {
      alert('Please enter a schema name');
      return;
    }

    const jsonSchema = generateJsonSchema(fields);
    const newSchema: SavedSchema = {
      id: Date.now().toString(),
      name: schemaName,
      schema: jsonSchema,
      fields: fields,
      createdAt: new Date().toISOString()
    };

    const updatedSchemas = [...savedSchemas, newSchema];
    setSavedSchemas(updatedSchemas);
    localStorage.setItem('jsonSchemas', JSON.stringify(updatedSchemas));
    
    // Reset form
    setFields([]);
    setSchemaName('');
    
    alert('Schema saved successfully!');
  };

  const deleteSchema = (schemaId: string) => {
    if (confirm('Are you sure you want to delete this schema?')) {
      const updatedSchemas = savedSchemas.filter(schema => schema.id !== schemaId);
      setSavedSchemas(updatedSchemas);
      localStorage.setItem('jsonSchemas', JSON.stringify(updatedSchemas));
    }
  };

  const loadSchema = (schema: SavedSchema) => {
    setFields(schema.fields);
    setActiveTab('builder');
  };

  const renderField = (field: SchemaField, parentId?: string, level: number = 0) => {
    return (
      <div key={field.id} className="space-y-2">
        <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
          {level > 0 && (
            <div className="w-px h-6 bg-gray-300 mr-2" />
          )}
          
          <Input
            placeholder="Field Name"
            value={field.name}
            onChange={(e) => {
              console.log('Input changed:', e.target.value, 'for field:', field.id);
              updateField(field.id, { name: e.target.value }, parentId);
            }}
            className="flex-1"
          />
          
          <Select
            value={field.type}
            onValueChange={(value: 'string' | 'number' | 'nested') => {
              const updates: Partial<SchemaField> = { type: value };
              // Initialize children array when type is changed to nested
              if (value === 'nested' && !field.children) {
                updates.children = [];
              }
              updateField(field.id, updates, parentId);
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="string">String</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="nested">Nested</SelectItem>
            </SelectContent>
          </Select>
          
          <Switch
            checked={field.required}
            onCheckedChange={(checked) => 
              updateField(field.id, { required: checked }, parentId)
            }
          />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeField(field.id, parentId)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {field.type === 'nested' && (
          <div className="ml-4">
            {(field.children || []).map(child => renderField(child, field.id, level + 1))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => addField(field.id)}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        )}
      </div>
    );
  };

  const jsonSchema = generateJsonSchema(fields);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">JSON Schema Builder</h1>
      
      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'builder' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('builder')}
        >
          Schema Builder
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'database' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('database')}
        >
          Database
        </button>
      </div>

      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Schema Builder */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Define Schema</h2>
            
            {/* Schema Name Input */}
            <div className="mb-4">
              <Input
                placeholder="Enter Schema Name"
                value={schemaName}
                onChange={(e) => setSchemaName(e.target.value)}
                className="mb-2"
              />
            </div>
            
            {/* Field Headers */}
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-600">
              <div className="flex-1">Field Name</div>
              <div className="w-32">Field Type</div>
              <div className="w-16">Required</div>
              <div className="w-10">Action</div>
            </div>
            
            {/* Fields */}
            <div className="space-y-4">
              {fields.map(field => renderField(field))}
            </div>
            
            {/* Add Field Button */}
            <Button
              onClick={() => addField()}
              className="mt-4 w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
            
            {/* Save Button */}
            <Button
              onClick={saveSchema}
              className="mt-4 w-full"
              disabled={!schemaName.trim() || fields.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Schema
            </Button>
          </div>
          
          {/* JSON Preview */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">JSON Schema</h2>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(jsonSchema, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Saved Schemas</h2>
          
          {savedSchemas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No saved schemas found.</p>
              <p className="text-sm">Create and save a schema to see it here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedSchemas.map((schema) => (
                <div key={schema.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{schema.name}</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadSchema(schema)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Load
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSchema(schema.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    Created: {new Date(schema.createdAt).toLocaleDateString()}
                  </p>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(schema.schema, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JsonSchemaBuilder; 