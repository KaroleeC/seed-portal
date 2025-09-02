import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Badge component not available in current setup, using inline styles instead
import { Archive, Edit, ArrowUpDown } from "lucide-react";
import { Quote } from "@shared/schema";

interface QuoteTableProps {
  quotes: Quote[];
  onEditQuote: (quote: Quote) => void;
  onArchiveQuote: (quoteId: number, contactEmail: string, e: React.MouseEvent) => void;
  searchTerm: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export function QuoteTable({
  quotes,
  onEditQuote,
  onArchiveQuote,
  searchTerm,
  sortField,
  sortOrder,
  onSort
}: QuoteTableProps) {
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getServiceBadge = (quote: Quote) => {
    if (quote.includesBookkeeping && quote.includesTaas) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Both Services</span>;
    } else if (quote.includesTaas) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Tax Service</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Bookkeeping</span>;
    }
  };

  const getApprovalBadge = (quote: Quote) => {
    if (quote.approvalRequired) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Approved</span>;
    } else if (quote.cleanupOverride) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-600">Override</span>;
    }
    return <span className="text-sm text-gray-500">Standard</span>;
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'text-blue-600' : 'text-blue-600 rotate-180'}`} />;
  };

  const filteredQuotes = quotes.filter(quote => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      quote.contactEmail.toLowerCase().includes(searchLower) ||
      (quote.companyName && quote.companyName.toLowerCase().includes(searchLower)) ||
      quote.industry.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">
              <button
                className="flex items-center gap-1 hover:text-blue-600"
                onClick={() => onSort('contactEmail')}
              >
                Contact
                {getSortIcon('contactEmail')}
              </button>
            </TableHead>
            <TableHead className="font-semibold">
              <button
                className="flex items-center gap-1 hover:text-blue-600"
                onClick={() => onSort('industry')}
              >
                Industry
                {getSortIcon('industry')}
              </button>
            </TableHead>
            <TableHead className="font-semibold">
              <button
                className="flex items-center gap-1 hover:text-blue-600"
                onClick={() => onSort('monthlyFee')}
              >
                Monthly Fee
                {getSortIcon('monthlyFee')}
              </button>
            </TableHead>
            <TableHead className="font-semibold">
              <button
                className="flex items-center gap-1 hover:text-blue-600"
                onClick={() => onSort('setupFee')}
              >
                Setup Fee
                {getSortIcon('setupFee')}
              </button>
            </TableHead>
            <TableHead className="font-semibold">Service</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">
              <button
                className="flex items-center gap-1 hover:text-blue-600"
                onClick={() => onSort('createdAt')}
              >
                Created
                {getSortIcon('createdAt')}
              </button>
            </TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredQuotes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                {searchTerm ? 'No quotes found matching your search.' : 'No quotes yet. Create your first quote above.'}
              </TableCell>
            </TableRow>
          ) : (
            filteredQuotes.map((quote) => (
              <TableRow
                key={quote.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onEditQuote(quote)}
              >
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900">{quote.contactEmail}</div>
                    {quote.companyName && (
                      <div className="text-sm text-gray-500">{quote.companyName}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-gray-700">{quote.industry}</TableCell>
                <TableCell className="font-semibold text-green-600">
                  {formatCurrency(quote.monthlyFee)}
                </TableCell>
                <TableCell className="font-semibold text-blue-600">
                  {formatCurrency(quote.setupFee)}
                </TableCell>
                <TableCell>{getServiceBadge(quote)}</TableCell>
                <TableCell>{getApprovalBadge(quote)}</TableCell>
                <TableCell className="text-gray-600">
                  {typeof quote.createdAt === 'string' ? formatDate(quote.createdAt) : formatDate(quote.createdAt.toISOString())}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditQuote(quote);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => onArchiveQuote(quote.id, quote.contactEmail, e)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}